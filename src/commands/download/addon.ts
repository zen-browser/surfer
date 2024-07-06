import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { isMatch } from 'picomatch'

import { config } from '../..'
import { ENGINE_DIR, MELON_TMP_DIR } from '../../constants'
import { log } from '../../log'

import {
  AddonInfo,
  configDispatch,
  delay,
  ensureDirectory,
  walkDirectoryTree,
  windowsPathToUnix,
} from '../../utils'
import { downloadFileToLocation } from '../../utils/download'
import { readItem } from '../../utils/store'
import { discard } from '../discard'
import axios from 'axios'

type GithubReleaseAssets =
  | { url: string; browser_download_url: string; name: string }[]
  | null

export const getAddons = (): (AddonInfo & { name: string })[] =>
  Object.keys(config.addons).map((addon) => ({
    name: addon,
    ...config.addons[addon],
  }))

export async function resolveAddonDownloadUrl(
  addon: AddonInfo
): Promise<string> {
  switch (addon.platform) {
    case 'url': {
      return addon.url
    }

    case 'amo': {
      try {
        const mozillaData = await axios.get(
          `https://addons.mozilla.org/api/v4/addons/addon/${addon.amoId}/versions/`
        )

        return mozillaData.data.results[0].files[0].url
      } catch (error) {
        log.warning(
          'The following error occured whilst fetching amo addon metadata'
        )
        log.error(error)

        return ''
      }
    }

    case 'github': {
      try {
        const githubData = await axios.get(
          `https://api.github.com/repos/${addon.repo}/releases/tags/${addon.version}`,
          {
            headers: {
              'User-Agent': 'surfer-build -> addon downloader',
            },
          }
        )

        const assets: GithubReleaseAssets = githubData.data.assets

        if (!assets)
          throw `The GitHub releases api did not return any assets for ${addon.repo} -> ${addon.version}.`

        const matchingFile = assets.find((asset) =>
          isMatch(asset.name, addon.fileGlob)
        )
        const fileDownloadUrl = matchingFile?.browser_download_url

        if (!matchingFile)
          throw `The GitHub releases api did not provide any files that matched '${addon.fileGlob}'`
        if (!fileDownloadUrl)
          throw `The GitHub releases api did not provide a download url for '${matchingFile.name}'`

        return (
          fileDownloadUrl ||
          '{Release file does not include a file matching the glob}'
        )
      } catch (error) {
        log.warning(
          'The following error occurred whilst fetching github metadata'
        )
        log.error(error)

        return ''
      }
    }
  }
}

export async function downloadAddon(
  url: string,
  addon: AddonInfo & { name: string }
): Promise<string> {
  const temporaryFile = join(MELON_TMP_DIR, addon.name + '.xpi')

  log.info(`Download addon from ${url}`)

  {
    const extensionCache = readItem<{ url: string }>(addon.name)

    if (extensionCache.isNone()) {
      // We haven't stored it in the cache, therefore we need to redownload
      // it
    } else {
      const cache = extensionCache.unwrap()
      if (cache.url == url && existsSync(temporaryFile)) {
        log.info(`Using cached version of ${addon.name}`)
        return temporaryFile
      }
    }
  }

  if (existsSync(temporaryFile)) {
    unlinkSync(temporaryFile)
  }

  await downloadFileToLocation(url, temporaryFile)

  // I do not know why, but this delay causes unzip to work reliably
  await delay(200)

  return temporaryFile
}

export async function unpackAddon(
  path: string,
  addon: AddonInfo & { name: string }
) {
  const outPath = join(ENGINE_DIR, 'browser', 'extensions', addon.name)

  if (existsSync(outPath)) {
    log.info(
      `The extension ${addon.name} has already been unpacked... skipping`
    )
    return
  }

  log.info(`Unpacking extension...`)

  // I do not know why, but this delay causes unzip to work reliably
  await delay(200)

  ensureDirectory(outPath)

  await configDispatch('unzip', {
    args: [windowsPathToUnix(path), '-d', windowsPathToUnix(outPath)],
    killOnError: true,
    shell: 'unix',
  })
}

export async function generateAddonMozBuild(
  addon: AddonInfo & { name: string }
) {
  const outPath = join(ENGINE_DIR, 'browser', 'extensions', addon.name)

  log.info(`Generating addon mozbuild...`)

  const files = await walkDirectoryTree(outPath)

  // Because the tree has the potential of being infinitely recursive, we
  // cannot possibly know the the type of the tree
  //
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function runTree(tree: any, parent: string): string {
    if (Array.isArray(tree)) {
      return tree
        .sort()
        .map(
          (file) =>
            `FINAL_TARGET_FILES.features["${addon.id}"]${parent} += ["${file
              .replace(outPath + '/', '')
              .replace(outPath, '')}"]`
        )
        .join('\n')
    }

    const current = (tree['.'] as string[])
      .sort()
      // Don't use windows path, which brick mozbuild
      .map((f) => windowsPathToUnix(f))
      .map(
        (f) =>
          `FINAL_TARGET_FILES.features["${addon.id}"]${parent} += ["${f
            .replace(outPath + '/', '')
            .replace(outPath, '')}"]`
      )
      .join('\n')

    const children = Object.keys(tree)
      .filter((folder) => folder !== '.')
      .filter((folder) => typeof tree[folder] !== 'undefined')
      .map((folder) => runTree(tree[folder], `${parent}["${folder}"]`))
      .join('\n')

    return `${current}\n${children}`
  }

  writeFileSync(
    join(outPath, 'moz.build'),
    `
DEFINES["MOZ_APP_VERSION"] = CONFIG["MOZ_APP_VERSION"]
DEFINES["MOZ_APP_MAXVERSION"] = CONFIG["MOZ_APP_MAXVERSION"]

${runTree(files, '')}`
  )
}

export async function initializeAddon(addon: AddonInfo & { name: string }) {
  const outPath = join(ENGINE_DIR, 'browser', 'extensions', addon.name)

  log.info(`Initializing addon...`)

  await configDispatch('git', {
    args: ['add', '-f', '.'],
    cwd: outPath,
  })
  await configDispatch('git', {
    args: ['commit', '-m', addon.name],
    cwd: ENGINE_DIR,
  })
}

export async function addAddonsToMozBuild(
  addons: (AddonInfo & { name: string })[]
) {
  log.info('Adding addons to mozbuild...')

  // Discard the file to make sure it has no changes
  await discard('browser/extensions/moz.build')

  const path = join(ENGINE_DIR, 'browser', 'extensions', 'moz.build')

  // Append all the files to the bottom
  writeFileSync(
    path,
    `${readFileSync(path).toString()}\nDIRS += [${addons
      .map((addon) => addon.name)
      .sort()
      .map((addon) => `"${addon}"`)
      .join(',')}]`
  )
}
