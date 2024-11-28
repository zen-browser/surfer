// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
import execa from 'execa'
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { log } from '../log'
import { ENGINE_DIR } from '../constants'

export const discard = async (file: string): Promise<void> => {
  const realFile = resolve(ENGINE_DIR, file)

  log.info(`Discarding ${realFile}...`)

  if (!existsSync(realFile)) throw new Error(`File ${realFile} does not exist`)
  if (!statSync(realFile).isFile()) throw new Error('Target must be a file.')

  try {
    await execa('git', ['restore', file], { cwd: ENGINE_DIR })
  } catch {
    log.warning(`The file ${file} was not changed`)
  }
}
