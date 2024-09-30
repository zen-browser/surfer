#!/usr/bin/env node

function getPlatform() {
  if (process.env.SURFER_PLATFORM) {
    return process.env.SURFER_PLATFORM
  }
  return process.platform
}

Object.defineProperty(process, 'surferPlatform', { value: getPlatform() })

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
import commander, { Command } from 'commander'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { errorHandler, config as configInited, versionFormatter } from './utils'
import { commands } from './cmds'
import { BIN_NAME, ENGINE_DIR } from './constants'
import { updateCheck } from './middleware/update-check'
import { registerCommand } from './middleware/register-command'
import { log } from './log'

// We have to use a dynamic require here, otherwise the typescript compiler
// mucks up the directory structure
// eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
const { version: surferVersion } = require('../package.json')

export const config = configInited

const program = new Command()

let reportedFFVersion

if (existsSync(resolve(ENGINE_DIR, 'browser', 'config', 'version.txt'))) {
  const version = readFileSync(
    resolve(ENGINE_DIR, 'browser', 'config', 'version.txt')
  )
    .toString()
    .replace(/\n/g, '')

  if (version !== config.version.version) reportedFFVersion = version
}

export const bin_name = BIN_NAME

const programVersions = []

export const compatMode = process.env.SURFER_COMPAT == 'true'

for (const brand in config.brands) {
  const brandConfig = config.brands[brand]
  programVersions.push({
    name: brandConfig.brandFullName,
    value: brandConfig.release.displayVersion,
  })
}

program
  .storeOptionsAsProperties(false)
  .passCommandToAction(false)
  .name(bin_name)
  .option('-v, --verbose', 'Outputs extra debugging messages to the console')
  .version(
    versionFormatter([
      ...programVersions,
      {
        name: 'Firefox',
        value: `${config.version.version} ${
          reportedFFVersion ? `(being reported as ${reportedFFVersion})` : ''
        }`,
      },
      { name: 'Surfer', value: surferVersion },
      reportedFFVersion
        ? `Mismatch detected between expected Firefox version and the actual version.\nYou may have downloaded the source code using a different version and\nthen switched to another branch.`
        : '',
    ])
  )

async function middleware(command: commander.Command) {
  // If the program is verbose, store that fact within the logger
  log.isDebug = program.opts().verbose

  await updateCheck()
  registerCommand(command.name())
}

for (const command of commands) {
  if (
    command.flags &&
    command.flags.platforms &&
    !command.flags.platforms.includes((process as any).surferPlatform)
  ) {
    continue
  }

  let buildCommand = program
    .command(command.cmd)
    .description(command.description)
    .aliases(command?.aliases || [])

  // Register all of the required options
  for (const opt of command?.options || []) {
    buildCommand = buildCommand.option(opt.arg, opt.description)
  }

  buildCommand = buildCommand.action(async (...arguments_) => {
    // Start loading the controller in the background whilst middleware is
    // executing
    const controller = command.requestController()

    if (!command.disableMiddleware) {
      await middleware(buildCommand)
    }

    // Finish loading the controller and execute it
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(await controller)(...arguments_)
  })
}

process
  .on('uncaughtException', errorHandler)
  .on('unhandledException', (error) => errorHandler(error, true))

program.parse(process.argv)
