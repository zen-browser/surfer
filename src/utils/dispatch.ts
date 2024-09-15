// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

import execa from 'execa'
import { BASH_PATH } from '../constants'
import { log } from '../log'

export const removeTimestamp = (input: string): string =>
  input.replace(/\s\d{1,5}:\d\d\.\d\d /g, '')

export const configDispatch = (
  cmd: string,
  config?: {
    args?: string[]
    /**
     * The current working directory this should be run in. Defaults to
     * `process.cwd()`
     */
    cwd?: string
    killOnError?: boolean
    logger?: (data: string) => void
    /**
     * Chose what shell you should be using for the operating system
     */
    shell?: 'default' | 'unix'
    env?: Record<string, string>
  }
): Promise<boolean> => {
  // Provide a default logger if none was specified by the user
  const logger = config?.logger || ((data: string) => log.info(data))

  // Decide what shell we should be using. False will use the system default
  let shell: string | boolean = false

  if (config?.shell) {
    switch (config.shell) {
      // Don't change anything if we are using the default shell
      case 'default': {
        break
      }

      case 'unix': {
        // Bash path provides a unix shell on windows
        shell = BASH_PATH || false
        break
      }

      default: {
        log.error(`dispatch() does not understand the shell '${shell}'`)
        break
      }
    }
  }

  const handle = (data: string | Error, killOnError?: boolean) => {
    const dataAsString = data.toString()

    for (const line of dataAsString.split('\n')) {
      if (line.length > 0) logger(removeTimestamp(line))
    }

    if (killOnError) {
      log.error('Command failed. See error above.')
    }
  }

  return new Promise((resolve) => {
    const proc = execa(cmd, config?.args, {
      cwd: config?.cwd || process.cwd(),
      shell: shell,
      env: {
        ...config?.env,
        ...process.env,
      },
    })

    proc.stdout?.on('data', (d) => handle(d))
    proc.stderr?.on('data', (d) => handle(d))

    proc.stdout?.on('error', (d) => handle(d, config?.killOnError || false))
    proc.stderr?.on('error', (d) => handle(d, config?.killOnError || false))

    proc.on('exit', () => {
      resolve(true)
    })
  })
}

/**
 * @deprecated Use configDispatch instead
 */
export const dispatch = (
  cmd: string,
  arguments_?: string[],
  cwd?: string,
  killOnError?: boolean,
  logger = (data: string) => log.info(data)
): Promise<boolean> => {
  return configDispatch(cmd, {
    args: arguments_,
    cwd: cwd,
    killOnError: killOnError,
    logger: logger,
  })
}
