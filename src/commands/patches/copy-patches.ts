// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
import { existsSync } from 'node:fs'
import { lstatSync, readFileSync } from 'node:fs'
import { ensureSymlink, remove } from 'fs-extra'
import { copyFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import glob from 'tiny-glob'

import { appendToFileSync, ensureDirectory, mkdirp } from '../../utils'
import { config } from '../..'
import { CURRENT_DIR, ENGINE_DIR, SRC_DIR, TESTS_DIR } from '../../constants'
import { IMelonPatch } from './command'

// =============================================================================
// Utilities

const getChunked = (location: string) => location.replace(/\\/g, '/').split('/')

export const copyManual = async (
  name: string,
  patchName: string
): Promise<void> => {
  let dest = ENGINE_DIR
  if (patchName === 'tests') {
    dest = resolve(dest, 'browser', 'base', 'zen-components')
  }
  const placeToCheck = patchName === 'tests' ? CURRENT_DIR : SRC_DIR
  // If the file exists and is not a symlink, we want to replace it with a
  // symlink to our file, so remove it
  if (
    existsSync(resolve(dest, ...getChunked(name))) &&
    !lstatSync(resolve(dest, ...getChunked(name))).isSymbolicLink()
  ) {
    await remove(resolve(dest, ...getChunked(name)))
  }
  try {
    if (
      process.platform == 'win32' &&
      !config.buildOptions.windowsUseSymbolicLinks
    ) {
      // Make the directory if it doesn't already exist.
      await mkdirp(dirname(resolve(dest, ...getChunked(name))))

      // By default, windows users do not have access to the permissions to create
      // symbolic links. As a work around, we will just copy the files instead
      await copyFile(
        resolve(placeToCheck, ...getChunked(name)),
        resolve(dest, ...getChunked(name))
      )
    } else {
      // Create the symlink
      await ensureSymlink(
        resolve(placeToCheck, ...getChunked(name)),
        resolve(dest, ...getChunked(name))
      )
    }
  } catch (e) {
    console.info('name: ', name)
    console.info('patchName: ', patchName)
    console.error(e) // Just in case we have an error
  }

  const gitignore = readFileSync(resolve(ENGINE_DIR, '.gitignore')).toString()

  if (!gitignore.includes(getChunked(name).join('/')))
    appendToFileSync(
      resolve(ENGINE_DIR, '.gitignore'),
      `\n${getChunked(name).join('/')}`
    )
}

// =============================================================================
// Data types

export interface ICopyPatch extends IMelonPatch {
  name: string
  src: string[]
}

// =============================================================================
// Exports

export async function get(): Promise<ICopyPatch[]> {
  const allFilesInSource = await glob('**/*', {
    filesOnly: true,
    cwd: SRC_DIR,
  })
  const files = allFilesInSource.filter(
    (f) => !(f.endsWith('.patch') || f.split('/').includes('node_modules'))
  )

  const manualPatches: ICopyPatch[] = []

  files.map((index) => {
    const group = index.split('/')[0]

    if (!manualPatches.some((m) => m.name == group)) {
      manualPatches.push({
        name: group,
        src: files.filter((f) => f.split('/')[0] == group),
      })
    }
  })

  await ensureDirectory('./tests')
  const testFiles = await glob('./tests/**/*', {
    filesOnly: true,
    cwd: '.',
  })

  const testFilesGrouped = testFiles.filter(
    (f) => !(f.endsWith('.patch') || f.split('/').includes('node_modules'))
  )

  testFilesGrouped.map((index) => {
    const group = index.split('/')[0]

    if (!manualPatches.some((m) => m.name == group)) {
      manualPatches.push({
        name: group,
        src: testFilesGrouped.filter((f) => f.split('/')[0] == group),
      })
    }
  })

  return manualPatches
}

export async function apply({ src, name }: ICopyPatch): Promise<void> {
  for (const item of src) {
    await copyManual(item, name)
  }
}
