// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

import { bin_name, config } from '..'
import { log } from '../log'
import { downloadInternals } from './download/firefox'
import { getLatestFF } from '../utils'

export const update = async (): Promise<void> => {
  const version = await getLatestFF(config.version.product)

  if (version == config.version.version) {
    log.error(`Firefox is already the latest version.`)
    process.exit(1)
  }

  // We are using force here to delete the engine directory if it already
  // exists to make way for the new version.
  await downloadInternals({ version, force: true, isCandidate: false })

  log.success(
    `Firefox has successfully been updated to ${version}.`,
    `You should be ready to make changes to ${config.name}.`,
    '',
    `You should import the patches next, run |${bin_name} import|.`,
    `To begin building ${config.name}, run |${bin_name} build|.`
  )
  console.log()
}
