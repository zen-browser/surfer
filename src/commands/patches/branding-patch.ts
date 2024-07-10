// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
import { renderAsync } from '@resvg/resvg-js'
import {
  readdirSync,
  lstatSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
} from 'node:fs'
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { every } from 'modern-async'
import { dirname, extname, join } from 'node:path'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import asyncIcns from 'async-icns'

import { config } from '../..'
import { CONFIGS_DIR, ENGINE_DIR, MELON_TMP_DIR } from '../../constants'
import { log } from '../../log'
import {
  addHash,
  defaultBrandsConfig,
  ensureEmpty,
  filesExist,
  mkdirpSync,
  stringTemplate,
  walkDirectory,
  windowsPathToUnix,
} from '../../utils'
import { templateDirectory } from '../setup-project'
import { IMelonPatch } from './command'

// =============================================================================
// Pure constants

export const BRANDING_DIR = join(CONFIGS_DIR, 'branding')
const BRANDING_STORE = join(ENGINE_DIR, 'browser', 'branding')
const BRANDING_FF = join(BRANDING_STORE, 'unofficial')

const REQUIRED_FILES = ['logo.png']

const CSS_REPLACE_REGEX = new RegExp(
  '#130829|hsla\\(235, 43%, 10%, .5\\)',
  'gm'
)

// =============================================================================
// Utility Functions

function checkForFaults(name: string, configPath: string) {
  if (!existsSync(configPath)) {
    throw new Error(`Branding ${name} does not exist`)
  }

  const requiredFiles = REQUIRED_FILES.map((file) => join(configPath, file))
  const requiredFilesExist = filesExist(requiredFiles)

  if (!requiredFilesExist) {
    throw new Error(
      `Missing some of the required files: ${requiredFiles
        .filter((file) => !existsSync(file))
        .join(', ')}`
    )
  }
}

function constructConfig(name: string) {
  return {
    brandingGenericName: config.name,
    brandingVendor: config.vendor,

    ...defaultBrandsConfig,
    ...config.brands[name],
  }
}

// =============================================================================
// Main code

async function setupImages(configPath: string, outputPath: string) {
  log.debug('Generating icons')

  // Firefox doesn't use 512 by 512, but we need it to generate ico files later
  await every([16, 22, 24, 32, 48, 64, 128, 256, 512], async (size) => {
    await sharp(join(configPath, 'logo.png'))
      .resize(size, size)
      .toFile(join(outputPath, `default${size}.png`))

    await copyFile(
      join(outputPath, `default${size}.png`),
      join(configPath, `logo${size}.png`)
    )

    return true
  })

  log.debug('Generating Windows Icons')
  writeFileSync(
    join(outputPath, 'firefox.ico'),
    await pngToIco([join(configPath, 'logo512.png')])
  )
  writeFileSync(
    join(outputPath, 'firefox64.ico'),
    await pngToIco([join(configPath, 'logo64.png')])
  )

  // TODO: Custom MacOS icon support
  if (process.surferPlatform == 'darwin') {
    log.debug('Generating Mac Icons')
    const temporary = join(MELON_TMP_DIR, 'macos_icon_info.iconset')

    if (existsSync(temporary)) await rm(temporary, { recursive: true })

    asyncIcns.convert({
      input: join(configPath, 'logo.png'),
      output: join(outputPath, 'firefox.icns'),
      sizes: [16, 32, 64, 128, 256, 512],
      tmpDirectory: temporary,
    })
  }

  mkdirSync(join(outputPath, 'content'), { recursive: true })

  await sharp(join(configPath, 'logo.png'))
    .resize(512, 512)
    .toFile(join(outputPath, 'content', 'about-logo.png'))
  await sharp(join(configPath, 'logo.png'))
    .resize(1024, 1024)
    .toFile(join(outputPath, 'content', 'about-logo@2x.png'))

  // Register logo in cache
  await addHash(join(configPath, 'logo.png'))

  log.debug('Generating macos install')
  const macosInstall = await renderAsync(
    await readFile(join(configPath, 'MacOSInstaller.svg'))
  )
  await writeFile(join(outputPath, 'content', 'background.png'), macosInstall)

  await addHash(join(configPath, 'MacOSInstaller.svg'))
}

async function setupLocale(
  outputPath: string,
  brandingConfig: {
    backgroundColor: string
    brandShorterName: string
    brandShortName: string
    brandFullName: string
    brandingGenericName: string
    brandingVendor: string
  }
) {
  for (const file of await walkDirectory(
    join(templateDirectory, 'branding.optional')
  )) {
    const fileContents = await readFile(windowsPathToUnix(file), {
      encoding: 'utf8',
    })

    const universalPath =
      // We want to avoid the pain that windows is going to throw at us with its
      // weird paths
      windowsPathToUnix(file)
        // We want to remove all of the extra folders that surround this from the
        // template folder
        .replace(
          windowsPathToUnix(join(templateDirectory, 'branding.optional') + '/'),
          ''
        )

    const sourceFolderPath = join(outputPath, universalPath)

    await mkdir(dirname(sourceFolderPath), { recursive: true })
    await writeFile(
      sourceFolderPath,
      stringTemplate(fileContents, brandingConfig)
    )
  }
}

async function copyMozFiles(
  outputPath: string,
  brandingConfig: {
    backgroundColor: string
    brandShorterName: string
    brandShortName: string
    brandFullName: string
    brandingGenericName: string
    brandingVendor: string
  }
) {
  const firefoxBrandingDirectoryContents = await walkDirectory(BRANDING_FF)
  const files = firefoxBrandingDirectoryContents.filter(
    (file) => !existsSync(join(outputPath, file.replace(BRANDING_FF, '')))
  )

  const css = files.filter((file) => extname(file).includes('css'))

  const everythingElse = files.filter((file) => !css.includes(file))

  for (const [contents, path] of css
    .map((filePath) => [
      readFileSync(filePath).toString(),
      join(outputPath, filePath.replace(BRANDING_FF, '')),
    ])
    .map(([contents, path]) => [
      contents.replace(CSS_REPLACE_REGEX, 'var(--theme-bg)') +
        `:root { --theme-bg: ${brandingConfig.backgroundColor} }`,
      path,
    ])) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, contents)
  }

  // Copy everything else from the default firefox branding directory
  for (const file of everythingElse) {
    mkdirpSync(dirname(join(outputPath, file.replace(BRANDING_FF, ''))))
    copyFileSync(file, join(outputPath, file.replace(BRANDING_FF, '')))
  }
}

// =============================================================================
// Exports

export interface IBrandingPatch extends IMelonPatch {
  value: unknown
}

export function get(): string[] {
  if (!existsSync(BRANDING_DIR)) return []

  return readdirSync(BRANDING_DIR).filter((file) =>
    lstatSync(join(BRANDING_DIR, file)).isDirectory()
  )
}

export async function apply(name: string): Promise<void> {
  const configPath = join(BRANDING_DIR, name)
  const outputPath = join(BRANDING_STORE, name)

  checkForFaults(name, configPath)

  const brandingConfig = constructConfig(name)

  // Remove the output path if it exists and recreate it
  ensureEmpty(outputPath)

  await setupImages(configPath, outputPath)
  await setupLocale(outputPath, brandingConfig)
  await copyMozFiles(outputPath, brandingConfig)
}
