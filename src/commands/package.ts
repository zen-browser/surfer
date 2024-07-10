// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readdir, unlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { bin_name, config } from '..'
import { DIST_DIR, ENGINE_DIR, OBJ_DIR } from '../constants'
import { log } from '../log'
import {
  configDispatch,
  dispatch,
  dynamicConfig,
  windowsPathToUnix,
} from '../utils'
import { generateBrowserUpdateFiles } from './updates/browser'

const machPath = resolve(ENGINE_DIR, 'mach')

export const surferPackage = async () => {
  const brandingKey = dynamicConfig.get('brand') as string
  const brandingDetails = config.brands[brandingKey]

  const version = brandingDetails.release.displayVersion
  const channel = brandingKey || 'unofficial'

  // The engine directory must have been downloaded for this to be valid
  // TODO: Make this a reusable function that can be used by everything
  if (!existsSync(ENGINE_DIR)) {
    log.error(
      `Unable to locate any source directories.\nRun |${bin_name} download| to generate the source directory.`
    )
  }

  if (!existsSync(machPath)) {
    log.error(`Cannot locate the 'mach' binary within ${ENGINE_DIR}`)
  }

  const arguments_ = ['package']

  log.info(
    `Packaging \`${config.binaryName}\` with args ${JSON.stringify(
      arguments_.slice(1, 0)
    )}...`
  )

  await dispatch(machPath, arguments_, ENGINE_DIR, true)

  log.info('Copying results up')

  log.debug("Creating the dist directory if it doesn't exist")
  if (!existsSync(DIST_DIR)) await mkdir(DIST_DIR, { recursive: true })

  log.debug('Indexing files to copy')
  const filesInMozillaDistrobution = await readdir(join(OBJ_DIR, 'dist'), {
    withFileTypes: true,
  })
  const files = filesInMozillaDistrobution
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)

  for (const file of files) {
    const destinationFile = join(DIST_DIR, file)
    log.debug(`Copying ${file}`)
    if (existsSync(destinationFile)) await unlink(destinationFile)
    await copyFile(join(OBJ_DIR, 'dist', file), destinationFile)
  }

  // Windows has some special dist files that are available within the dist
  // directory.
  if ((process as any).surferPlatform == 'win32') {
    const installerDistributionDirectory = join(
      OBJ_DIR,
      'dist',
      'install',
      'sea'
    )

    if (!existsSync(installerDistributionDirectory)) {
      log.error(
        `Could not find windows installer files located at '${installerDistributionDirectory}'`
      )
    }

    const installerDistributionDirectoryContents = await readdir(
      installerDistributionDirectory,
      { withFileTypes: true }
    )
    const windowsInstallerFiles = installerDistributionDirectoryContents
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)

    for (const file of windowsInstallerFiles) {
      let newFileName = file

      // There are some special cases that I want to reformat the name for
      if (file.includes('.installer.exe')) {
        newFileName = `${config.binaryName}.installer.exe`
      }
      if (file.includes('.installer-stub.exe')) {
        newFileName = `${config.binaryName}.installer.pretty.exe`
        log.warning(
          `The installer ${newFileName} requires that your binaries are available from the internet and everything is correctly configured. I recommend you ship '${config.binaryName}.installer.exe' if you have not set this up correctly yet`
        )
      }

      // Actually copy
      const destinationFile = join(DIST_DIR, newFileName)
      log.debug(`Copying ${file}`)
      if (existsSync(destinationFile)) await unlink(destinationFile)
      await copyFile(
        join(installerDistributionDirectory, file),
        destinationFile
      )
    }
  }

  const marPath = await createMarFile(version, channel)
  dynamicConfig.set('marPath', marPath)

  await generateBrowserUpdateFiles()

  log.info()
  log.info(`Output written to ${DIST_DIR}`)

  log.success('Packaging complected!')
}

function getCurrentBrandName(): string {
  const brand = dynamicConfig.get('brand') as string

  if (brand == 'unofficial') {
    return 'Nightly'
  }

  return config.brands[brand].brandFullName
}

async function createMarFile(version: string, channel: string) {
  log.info(`Creating mar file...`)
  let marBinary: string = windowsPathToUnix(
    join(OBJ_DIR, 'dist/host/bin', 'mar')
  )

  if ((process as any).surferPlatform == 'win32') {
    marBinary += '.exe'
  }

  // On macos this should be
  // <obj dir>/dist/${binaryName}/${brandFullName}.app and on everything else,
  // the contents of the folder <obj dir>/dist/${binaryName}
  const binary =
    (process as any).surferPlatform == 'darwin'
      ? join(OBJ_DIR, 'dist', config.binaryName, `${getCurrentBrandName()}.app`)
      : join(OBJ_DIR, 'dist', config.binaryName)

  const marPath = windowsPathToUnix(join(DIST_DIR, 'output.mar'))
  await configDispatch('./tools/update-packaging/make_full_update.sh', {
    args: [
      // The mar output location
      windowsPathToUnix(join(DIST_DIR)),
      binary,
    ],
    cwd: ENGINE_DIR,
    env: {
      MOZ_PRODUCT_VERSION: version,
      MAR_CHANNEL_ID: channel,
      MAR: marBinary,
    },
  })
  return marPath
}
