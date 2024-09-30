// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
import execa from 'execa'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { log } from '../log'

export const BIN_NAME = 'surfer'

export const BUILD_TARGETS = ['linux', 'windows', 'macos']
export const ARCHITECTURE = ['i686', 'x86_64']

export const PATCH_ARGS = [
  '--ignore-space-change',
  '--ignore-whitespace',
  '--verbose',
]

export const ENGINE_DIR = resolve(process.cwd(), 'engine')
export const SRC_DIR = resolve(process.cwd(), 'src')
// eslint-disable-next-line unicorn/prefer-module
export const PATCHES_DIR = resolve(
  __dirname,
  '../..',
  'template',
  'patches.optional'
)
export const COMMON_DIR = resolve(process.cwd(), 'common')
export const CONFIGS_DIR = resolve(process.cwd(), 'configs')
export const MELON_DIR = resolve(process.cwd(), '.surfer')
export const MELON_TMP_DIR = resolve(MELON_DIR, 'engine')
export const DIST_DIR = resolve(process.cwd(), 'dist')

mkdirSync(MELON_TMP_DIR, { recursive: true })

/**
 * What we think the current platform might be. Should not be used outside of this
 * file
 */
let CONFIG_GUESS = ''

// We can find the current obj-* dir simply by searching. This shouldn't be to
// hard and is more reliable than autoconf is. This command should only be run
// if the engine directory has already been created
if (existsSync(ENGINE_DIR)) {
  const possibleFolders = readdirSync(ENGINE_DIR, {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((entry) => entry.startsWith('obj-'))
    .map((entry) => entry.replace('obj-', ''))

  if (possibleFolders.length === 0)
    log.debug(
      "There are no obj-* folders. This may mean you haven't completed a build yet"
    )
  else if (possibleFolders.length === 1) CONFIG_GUESS = possibleFolders[0]
  else {
    log.warning(
      `There are multiple obj-* folders. Defaulting to obj-${possibleFolders[0]}`
    )
    CONFIG_GUESS = possibleFolders[0]
  }
}

export const OBJ_DIR = resolve(ENGINE_DIR, `obj-${CONFIG_GUESS}`)

// TODO: Remove this, it is unused
export const FTL_STRING_LINE_REGEX =
  /(([\dA-Za-z-]*|\.[a-z-]*) =(.*|\.)|\[[\dA-Za-z]*].*(\n\s?\s?})?|\*\[[\dA-Za-z]*] .*(\n\s?\s?})?)/gm

// =================
// Windows constants
// =================

export let BASH_PATH: string | undefined

// All windows specific code should be located inside of this if statement
if (process.platform == 'win32') {
  const gitPath = execa.sync('where.exe git.exe').stdout.toString()

  if (gitPath.includes('git.exe')) {
    // Git is installed on the computer, the bash terminal is probably located
    // somewhere nearby
    log.debug('Fount git at ' + gitPath)

    log.debug(`Searching for bash`)
    BASH_PATH = resolve(gitPath, '../..', 'bin/bash.exe')
    if (!existsSync(BASH_PATH)) {
      log.debug(`Could not find bash at ${BASH_PATH}`)

      BASH_PATH = execa.sync('where.exe bash.exe').stdout.toString()
      if (!BASH_PATH.includes('bash.exe')) {
        BASH_PATH = process.env.SURFER_SIGNING_MODE
          ? 'C:\\mozilla-build\\msys2\\usr\\bin\\bash.exe'
          : ''
        if (BASH_PATH === '') {
          log.error('Could not find bash, aborting')
        }
      }
    }
    // Replace .exe with .EXE
    BASH_PATH = BASH_PATH.replace(/\.exe$/, '.EXE')

    log.debug(`Found bash at ${BASH_PATH}`)
  } else {
    log.error(
      "Git doesn't appear to be installed on this computer. Please install it before continuing"
    )
  }
}
