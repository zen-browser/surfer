// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
export interface Cmd {
  cmd: string
  description: string

  /**
   * A function that returns the controller as a promise. We want to dynamically
   * load them to reduce the startup time of surfer, which, at the time of
   * writing, is getting a touch long
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestController: () => Promise<(...arguments_: any) => void>

  options?: CmdOption[]
  aliases?: string[]
  flags?: {
    platforms?: CmdFlagPlatform[]
  }

  disableMiddleware?: boolean
}

export interface CmdOption {
  arg: string
  description: string
}

export type CmdFlagPlatform = NodeJS.Platform

declare module 'mount-dmg'
