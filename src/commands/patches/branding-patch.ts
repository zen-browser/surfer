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

import { compatMode, config } from '../..'
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

const REQUIRED_FILES = [
  'logo.png',
  'logo-mac.png',
  'firefox.ico',
  'firefox64.ico',
]
const BRANDING_NSIS = 'branding.nsi'

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
    const logoPath = join(configPath, `logo${size}.png`)
    if (!filesExist([logoPath])) throw new Error(`Missing logo${size}.png`)

    const outputPathLogo = join(outputPath, `default${size}.png`)
    await copyFile(logoPath, outputPathLogo)
    return true
  })

  // TODO: Custom MacOS icon support
  if ((process as any).surferPlatform == 'darwin') {
    log.debug('Generating Mac Icons')
    log.debug(`Using MacOS icon: ${join(configPath, 'logo-mac.png')}`)
    log.debug(`Output path: ${outputPath}`)
    const temporary = join(MELON_TMP_DIR, 'macos_icon_info.iconset')

    if (existsSync(temporary)) await rm(temporary, { recursive: true })

    await asyncIcns.convert({
      input: join(configPath, 'logo-mac.png'),
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

  const everythingElse = files.filter(
    (file) => !css.includes(file) && !file.includes(BRANDING_NSIS)
  )

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

  const brandingNsis = files.filter((file) => file.includes(BRANDING_NSIS))
  console.assert(
    brandingNsis.length == 1,
    'There should only be one branding.nsi file'
  )
  const outputBrandingNsis = join(
    outputPath,
    brandingNsis[0].replace(BRANDING_FF, '')
  )
  const configureProfileBrandingPath = join(
    outputPath,
    'pref',
    'firefox-branding.js'
  )
  log.debug('Configuring branding.nsi into ' + outputBrandingNsis)
  configureBrandingNsis(outputBrandingNsis, brandingConfig)

  // Copy everything else from the default firefox branding directory
  for (const file of everythingElse) {
    mkdirpSync(dirname(join(outputPath, file.replace(BRANDING_FF, ''))))
    copyFileSync(file, join(outputPath, file.replace(BRANDING_FF, '')))
  }

  configureProfileBranding(configureProfileBrandingPath, brandingConfig)
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
  await addOptionalIcons(configPath, outputPath)

  setUpdateURLs()
}

function configureBrandingNsis(
  brandingNsis: string,
  brandingConfig: {
    backgroundColor: string
    brandShorterName: string
    brandShortName: string
    brandFullName: string
    brandingGenericName: string
    brandingVendor: string
  }
) {
  writeFileSync(
    brandingNsis,
    `
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# NSIS branding defines for official release builds.
# The nightly build branding.nsi is located in browser/installer/windows/nsis/
# The unofficial build branding.nsi is located in browser/branding/unofficial/

# BrandFullNameInternal is used for some registry and file system values
# instead of BrandFullName and typically should not be modified.
!define BrandFullNameInternal "${brandingConfig.brandFullName}"
!define BrandFullName         "${brandingConfig.brandFullName}"
!define CompanyName           "${brandingConfig.brandingVendor}"
!define URLInfoAbout          "https://zen-browser.app"
!define URLUpdateInfo         "https://zen-browser.app/release-notes/\${AppVersion}"
!define HelpLink              "https://github.com/zen-browser/desktop/issues"

; The OFFICIAL define is a workaround to support different urls for Release and
; Beta since they share the same branding when building with other branches that
; set the update channel to beta.
!define OFFICIAL
!define URLStubDownloadX86 "https://download.mozilla.org/?os=win&lang=\${AB_CD}&product=firefox-latest"
!define URLStubDownloadAMD64 "https://download.mozilla.org/?os=win64&lang=\${AB_CD}&product=firefox-latest"
!define URLStubDownloadAArch64 "https://download.mozilla.org/?os=win64-aarch64&lang=\${AB_CD}&product=firefox-latest"
!define URLManualDownload "https://zen-browser.app/download"
!define URLSystemRequirements "https://www.mozilla.org/firefox/system-requirements/"
!define Channel "release"

# The installer's certificate name and issuer expected by the stub installer
!define CertNameDownload   "${brandingConfig.brandFullName}"
!define CertIssuerDownload "DigiCert SHA2 Assured ID Code Signing CA"

# Dialog units are used so the UI displays correctly with the system's DPI
# settings. These are tweaked to look good with the en-US strings; ideally
# we would customize them for each locale but we don't really have a way to
# implement that and it would be a ton of work for the localizers.
!define PROFILE_CLEANUP_LABEL_TOP "50u"
!define PROFILE_CLEANUP_LABEL_LEFT "22u"
!define PROFILE_CLEANUP_LABEL_WIDTH "175u"
!define PROFILE_CLEANUP_LABEL_HEIGHT "100u"
!define PROFILE_CLEANUP_LABEL_ALIGN "left"
!define PROFILE_CLEANUP_CHECKBOX_LEFT "22u"
!define PROFILE_CLEANUP_CHECKBOX_WIDTH "175u"
!define PROFILE_CLEANUP_BUTTON_LEFT "22u"
!define INSTALL_HEADER_TOP "70u"
!define INSTALL_HEADER_LEFT "22u"
!define INSTALL_HEADER_WIDTH "180u"
!define INSTALL_HEADER_HEIGHT "100u"
!define INSTALL_BODY_LEFT "22u"
!define INSTALL_BODY_WIDTH "180u"
!define INSTALL_INSTALLING_TOP "115u"
!define INSTALL_INSTALLING_LEFT "270u"
!define INSTALL_INSTALLING_WIDTH "150u"
!define INSTALL_PROGRESS_BAR_TOP "100u"
!define INSTALL_PROGRESS_BAR_LEFT "270u"
!define INSTALL_PROGRESS_BAR_WIDTH "150u"
!define INSTALL_PROGRESS_BAR_HEIGHT "12u"

!define PROFILE_CLEANUP_CHECKBOX_TOP_MARGIN "12u"
!define PROFILE_CLEANUP_BUTTON_TOP_MARGIN "12u"
!define PROFILE_CLEANUP_BUTTON_X_PADDING "80u"
!define PROFILE_CLEANUP_BUTTON_Y_PADDING "8u"
!define INSTALL_BODY_TOP_MARGIN "20u"

# Font settings that can be customized for each channel
!define INSTALL_HEADER_FONT_SIZE 20
!define INSTALL_HEADER_FONT_WEIGHT 600
!define INSTALL_INSTALLING_FONT_SIZE 15
!define INSTALL_INSTALLING_FONT_WEIGHT 600

# UI Colors that can be customized for each channel
!define COMMON_TEXT_COLOR 0x000000
!define COMMON_BACKGROUND_COLOR 0xFFFFFF
!define INSTALL_INSTALLING_TEXT_COLOR 0xFFFFFF
# This color is written as 0x00BBGGRR because it's actually a COLORREF value.
!define PROGRESS_BAR_BACKGROUND_COLOR 0xFFAA00
`
  )
}

function addOptionalIcons(brandingPath: string, outputPath: string) {
  // move all icons in the top directory and inside "content/" into the branding directory
  const icons = readdirSync(brandingPath)
  const iconsContent = readdirSync(join(brandingPath, 'content'))

  for (const icon of icons) {
    if (icon.includes('content')) continue
    log.info(`Copying ${icon} to ${outputPath}`)
    copyFileSync(join(brandingPath, icon), join(outputPath, icon))
  }

  for (const icon of iconsContent) {
    log.info(`Copying ${icon} to ${outputPath}`)
    copyFileSync(
      join(brandingPath, 'content', icon),
      join(outputPath, 'content', icon)
    )
  }
}

function configureProfileBranding(
  brandingPath: string,
  brandingConfig: {
    backgroundColor: string
    brandShorterName: string
    brandShortName: string
    brandFullName: string
    brandingGenericName: string
    brandingVendor: string
  }
) {
  writeFileSync(
    brandingPath,
    `
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

pref("startup.homepage_override_url", "https://zen-browser.app/whatsnew?v=%VERSION%");
pref("startup.homepage_welcome_url", "https://zen-browser.app/welcome/");
pref("startup.homepage_welcome_url.additional", "https://zen-browser.app/privacy-policy/");

// Give the user x seconds to react before showing the big UI. default=192 hours
pref("app.update.promptWaitTime", 691200);
// app.update.url.manual: URL user can browse to manually if for some reason
// all update installation attempts fail.
// app.update.url.details: a default value for the "More information about this
// update" link supplied in the "An update is available" page of the update
// wizard.
pref("app.update.url.manual", "https://zen-browser.app/download/");
pref("app.update.url.details", "https://zen-browser.app/release-notes/latest/");
pref("app.releaseNotesURL", "https://zen-browser.app/release-notes/%VERSION%/");
pref("app.releaseNotesURL.aboutDialog", "https://www.zen-browser.app/release-notes/%VERSION%/");
pref("app.releaseNotesURL.prompt", "https://zen-browser.app/release-notes/%VERSION%/");

// Number of usages of the web console.
// If this is less than 5, then pasting code into the web console is disabled
pref("devtools.selfxss.count", 5);
`
  )
}

function setUpdateURLs() {
  const sufix =
    compatMode && (process as any).surferPlatform !== 'macos' ? '-generic' : ''
  const baseURL = `URL=https://@MOZ_APPUPDATE_HOST@/updates/browser/%BUILD_TARGET%/%CHANNEL%${sufix}/update.xml`
  const appIni = join(ENGINE_DIR, 'build', 'application.ini.in')
  const appIniContents = readFileSync(appIni).toString()
  const updatedAppIni = appIniContents.replace(/URL=.*update.xml/g, baseURL)
  writeFileSync(appIni, updatedAppIni)
}
