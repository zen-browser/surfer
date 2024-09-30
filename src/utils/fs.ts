// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  rmSync,
  writeSync,
} from 'node:fs'
import { mkdir, readdir, stat } from 'node:fs/promises'
import { join, isAbsolute } from 'node:path'

import { log } from '../log'

/**
 * On windows, converts a windows style path to a unix path. On unix, passes the
 * output through to the other side
 *
 * @param path The path that you want to be converted to a unix path
 * @returns A unix path
 */
export const windowsPathToUnix = (path: string): string =>
  (process as any).platform == 'win32'
    ? (process.env.SURFER_SIGNING_MODE ? '/c' : '') +
      path.replace(/[\\]+/g, '/').replace(/^([a-zA-Z]+:|\.\/)/, '')
    : path

export async function walkDirectory(directory: string): Promise<string[]> {
  const output = []

  if (!isAbsolute(directory)) {
    log.askForReport()
    log.error('Please provide an absolute input to walkDirectory')
  }

  try {
    const directoryContents = await readdir(directory)

    for (const file of directoryContents) {
      const fullPath = join(directory, file)
      const fStat = await stat(fullPath)

      if (fStat.isDirectory()) {
        for (const newFile of await walkDirectory(fullPath)) {
          output.push(newFile)
        }
      } else {
        output.push(fullPath)
      }
    }
  } catch (error) {
    log.askForReport()
    log.error(error)
  }

  return output
}

export type TreeType = { [property: string]: string[] | TreeType }

export async function walkDirectoryTree(directory: string): Promise<TreeType> {
  const output: TreeType = {}

  if (!isAbsolute(directory)) {
    log.askForReport()
    log.error('Please provide an absolute input to walkDirectory')
  }

  try {
    const directoryContents = await readdir(directory)

    const currentOut = []

    for (const file of directoryContents) {
      const fullPath = join(directory, file)
      const fStat = await stat(fullPath)

      if (fStat.isDirectory()) {
        output[file] = await walkDirectoryTree(fullPath)
      } else {
        currentOut.push(fullPath)
      }
    }

    output['.'] = currentOut
  } catch (error) {
    log.askForReport()
    log.error(error)
  }

  return output
}

export async function ensureDirectory(directory: string): Promise<void> {
  if (!existsSync(directory)) {
    await mkdirp(directory)
  }
}

export function mkdirp(directory: string): Promise<string | undefined> {
  return mkdir(directory, { recursive: true })
}

export function mkdirpSync(directory: string): string | undefined {
  return mkdirSync(directory, { recursive: true })
}

export function appendToFileSync(fileName: string, content: string): void {
  const file = openSync(fileName, 'a')
  writeSync(file, content)
  closeSync(file)
}

export function filesExist(files: string[]): boolean {
  return files.every((file) => existsSync(file))
}

export function ensureEmpty(path: string) {
  if (existsSync(path)) {
    rmSync(path, { recursive: true })
  }

  mkdirSync(path, { recursive: true })
}

export async function getSize(path: string): Promise<number> {
  const fileInfo = await stat(path)
  return fileInfo.size
}
