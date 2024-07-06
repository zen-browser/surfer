// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
import { existsSync } from 'node:fs'
import { log } from '../log'
import { BIN_NAME, ENGINE_DIR } from '../constants'
import { dispatch, hasConfig } from '../utils'

export const status = async (): Promise<void> => {
  const configExists = hasConfig()
  const engineExists = existsSync(ENGINE_DIR)

  if (!configExists && !engineExists) {
    log.info(
      `Surfer doesn't appear to be setup for this project. You can set it up by running |${BIN_NAME} setup-project|`
    )

    return
  }

  if (engineExists) {
    log.info("The following changes have been made to firefox's source code")
    await dispatch('git', ['diff'], ENGINE_DIR)

    return
  } else {
    log.info(
      `It appears that ${BIN_NAME} has been configured, but you haven't run |${BIN_NAME} download|`
    )

    return
  }
}
