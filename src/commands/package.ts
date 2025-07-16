// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
import { existsSync, lstat, rmdirSync, rmSync } from 'node:fs'
import { copyFile, mkdir, readdir, unlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { bin_name, compatMode, config } from '..'
import { DIST_DIR, ENGINE_DIR, OBJ_DIR } from '../constants'
import { log } from '../log'
import {
  configDispatch,
  dispatch,
  dynamicConfig,
  windowsPathToUnix,
} from '../utils'
import { generateBrowserUpdateFiles } from './updates/browser'
import { lstatSync, readFile, remove, removeSync } from 'fs-extra'

const machPath = resolve(ENGINE_DIR, 'mach')

async function getLocales() {
  // l10n/supported-languages is a list of locales divided by newlines
  // open the file and split it by newlines
  const localesText = await readFile('l10n/supported-languages', 'utf-8')
  log.info(`Found locales:\n${localesText}`)
  return localesText.split('\n')
}

export const surferPackage = async () => {
  const brandingKey = dynamicConfig.get('brand') as string
  const brandingDetails = config.brands[brandingKey]

  const version = brandingDetails.release.displayVersion
  const channel = brandingKey || 'unofficial'

  log.debug("Creating the dist directory if it doesn't exist")
  if (!existsSync(DIST_DIR)) await mkdir(DIST_DIR, { recursive: true })

  // The engine directory must have been downloaded for this to be valid
  // TODO: Make this a reusable function that can be used by everything
  if (!process.env.JUST_MAR) {
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

    log.info('Copying language packs')

    await dispatch(
      machPath,
      ['package-multi-locale', '--locales', ...(await getLocales())],
      ENGINE_DIR,
      true
    )

    log.info('Copying results up')

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
        'dist'
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
  }

  const marPath = await createMarFile(
    version,
    channel,
    brandingDetails.release.github
  )
  dynamicConfig.set('marPath', marPath)

  await generateBrowserUpdateFiles()

  log.info()
  log.info(`Output written to ${DIST_DIR}`)

  log.success('Packaging complected!')
}

export function getCurrentBrandName(): string {
  const brand = dynamicConfig.get('brand') as string

  if (brand == 'unofficial') {
    return 'Nightly'
  }

  return config.brands[brand].brandShortName
}

async function createMarFile(
  version: string,
  channel: string,
  github?: { repo: string }
): Promise<string> {
  log.info(`Creating mar file...`)
  let marBinary: string = windowsPathToUnix(
    join(OBJ_DIR, 'dist/host/bin', 'mar')
  )

  if (process.platform == 'win32') {
    marBinary += '.exe'
  }

  // On macos this should be
  // <obj dir>/dist/${binaryName}/${brandFullName}.app and on everything else,
  // the contents of the folder <obj dir>/dist/${binaryName}
  const binary =
    (process as any).surferPlatform == 'darwin'
      ? process.env.JUST_MAR
        ? join(OBJ_DIR, 'dist', `${getCurrentBrandName()}.app`)
        : join(
            OBJ_DIR,
            'dist',
            config.binaryName,
            `${getCurrentBrandName()}.app`
          )
      : join(OBJ_DIR, 'dist', config.binaryName)

  const marPath = resolve(DIST_DIR, 'output.mar')
  log.debug(`Writing MAR to ${DIST_DIR} from ${binary}`)
  await configDispatch('./tools/update-packaging/make_full_update.sh', {
    args: [
      // The mar output location
      windowsPathToUnix(DIST_DIR),
      windowsPathToUnix(binary),
    ],
    cwd: ENGINE_DIR,
    env: {
      MOZ_PRODUCT_VERSION: version,
      MAR_CHANNEL_ID: channel,
      MAR: process.env.MAR ? windowsPathToUnix(process.env.MAR) : marBinary,
    },
    shell: process.env.SURFER_SIGNING_MODE ? 'unix' : 'default',
  })
  return marPath
}
