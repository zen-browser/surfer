// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

import { bin_name, config } from '..'
import { log } from '../log'
import { downloadInternals } from './download/firefox'

type Options = {
  force?: boolean
}

export const download = async (options: Options): Promise<void> => {
  const version = config.version.version

  // If gFFVersion isn't specified, provide legible error
  if (!version) {
    log.error(
      'You have not specified a version of firefox in your config file. This is required to build a firefox fork'
    )
    process.exit(1)
  }

  await downloadInternals({ version, force: options.force })

  log.success(
    `You should be ready to make changes to ${config.name}.`,
    '',
    'Remember to change the repository in configs/common/mozconfig to your own.',
    `You should import the patches next, run |${bin_name} import|.`,
    `To begin building ${config.name}, run |${bin_name} build|.`
  )
  console.log()
}
