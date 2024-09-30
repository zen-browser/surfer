import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { parse } from 'ini'
import { dirname, join } from 'node:path'
import { create } from 'xmlbuilder2'
import { bin_name, compatMode, config } from '../..'
import { DIST_DIR, OBJ_DIR } from '../../constants'
import { log } from '../../log'
import {
  dynamicConfig,
  ensureEmpty,
  generateHash,
  getSize,
  ReleaseInfo,
} from '../../utils'

/**
 * These are all of the different platforms that aus should deploy to. Note that
 * the names have been simplified and they are all only the ones that are
 * supported by Pulse Browser. If you need something else, open an issue on gh.
 *
 * Based off the code from mozrelease:
 * https://searchfox.org/mozilla-central/source/python/mozrelease/mozrelease/platforms.py
 * https://searchfox.org/mozilla-central/source/taskcluster/gecko_taskgraph/util/partials.py
 */
const ausPlatformsMap = {
  linux64: ['Linux_x86_64-gcc3'],
  macosIntel: [
    'Darwin_x86_64-gcc3-u-i386-x86_64',
    'Darwin_x86-gcc3-u-i386-x86_64',
    'Darwin_x86-gcc3',
    'Darwin_x86_64-gcc3',
  ],
  macosArm: ['Darwin_aarch64-gcc3'],
  win64: ['WINNT_x86_64-msvc', 'WINNT_x86_64-msvc-x64'],
}

export async function getPlatformConfig() {
  let platformINI = join(OBJ_DIR, 'dist', config.binaryName, 'platform.ini')
  if (!existsSync(platformINI))
    platformINI = join(OBJ_DIR, 'dist', 'bin', 'platform.ini')

  const iniContents = await readFile(platformINI)
  return parse(iniContents.toString())
}

function getReleaseMarName(releaseInfo: ReleaseInfo): string | undefined {
  if (!releaseInfo.archives) {
    log.error('No archives found in the release information')
    return
  }

  switch ((process as any).surferPlatform) {
    case 'win32': {
      return compatMode
        ? releaseInfo.archives['windows-compat']
        : releaseInfo.archives['windows']
    }
    case 'darwin': {
      return compatMode
        ? releaseInfo.archives['macos-x64']
        : releaseInfo.archives['macos-aarch64']
    }
    case 'linux': {
      return compatMode
        ? releaseInfo.archives['linux-compat']
        : releaseInfo.archives['linux']
    }
  }
}

function getReleaseMarURL(releaseInfo: ReleaseInfo) {
  const releaseMarName = getReleaseMarName(releaseInfo)
  let completeMarURL = `https://${config.updateHostname || 'localhost:8000'}/${
    releaseMarName || 'output.mar'
  }`

  // The user is using github to distribute release binaries for this version.
  if (releaseInfo.github) {
    let releaseVersion = releaseInfo.displayVersion
    const channel = dynamicConfig.get('brand') as string
    if (channel === 'twilight') {
      releaseVersion = 'twilight'
    }
    completeMarURL = `https://github.com/${releaseInfo.github.repo}/releases/download/${releaseVersion}/${releaseMarName}`
    log.info(`Using '${completeMarURL}' as the distribution url`)
  } else {
    log.warning(
      `No release information found! Default release location will be "${completeMarURL}"`
    )
  }
  return completeMarURL
}

async function writeUpdateFileToDisk(
  target: string,
  channel: string,
  updateObject: {
    updates: {
      update: Record<
        string,
        | string
        | number
        | Record<string, string | number | undefined>
        | undefined
      >
    }
  }
) {
  const suffix =
    compatMode && (process as any).surferPlatform !== 'macos' ? '-generic' : ''
  const xmlPath = join(
    DIST_DIR,
    'update',
    'browser',
    target,
    channel + suffix,
    'update.xml'
  )
  const document = create(updateObject)

  ensureEmpty(dirname(xmlPath))
  await writeFile(xmlPath, document.end({ prettyPrint: true }))
}

function getTargets(): string[] {
  if ((process as any).surferPlatform == 'win32') {
    return ausPlatformsMap.win64
  }

  if ((process as any).surferPlatform == 'linux') {
    return ausPlatformsMap.linux64
  }

  // Everything else will have to be darwin of some kind. So, for future possible
  // Apple silicon support, we should chose between the two wisely
  // TODO: This is a hack, fix it
  if (!compatMode) {
    return ausPlatformsMap.macosArm
  }

  return ausPlatformsMap.macosIntel
}

export async function generateBrowserUpdateFiles() {
  log.info('Creating browser AUS update files')

  const brandingKey = dynamicConfig.get('brand') as string
  const channel = brandingKey
  const brandingDetails = config.brands[brandingKey]
  const releaseInfo = brandingDetails.release
  const { displayVersion: version } = releaseInfo

  const marPath = dynamicConfig.get('marPath')

  if (!marPath || marPath == '') {
    log.error(
      `No mar file has been built! Make sure you ran |${bin_name} package| before this command`
    )
    return
  }

  // We need the sha512 hash of the mar file for the update file. AUS will use
  // this to ensure that the mar file has not been modified on the distribution
  // server
  const marHash = generateHash(marPath, 'sha512')

  // We need platform information, primarily for the BuildID, but other stuff
  // might be helpful later
  const platform = await getPlatformConfig()

  const completeMarURL = getReleaseMarURL(releaseInfo)

  const updateObject = {
    updates: {
      update: {
        // TODO: Correct update type from semvar, store the old version somewhere
        '@type': 'minor',
        '@displayVersion': version,
        '@appVersion': version,
        '@platformVersion': config.version.version,
        '@buildID': platform.Build.BuildID,

        patch: {
          // TODO: Partial patches might be nice for download speed
          '@type': 'complete',
          '@URL': completeMarURL,
          '@hashFunction': 'sha512',
          '@hashValue': await marHash,
          '@size': await getSize(marPath),
        },
      },
    },
  }

  for (const target of getTargets()) {
    await writeUpdateFileToDisk(target, channel, updateObject)
  }
}
