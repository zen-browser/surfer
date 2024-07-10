// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
// This file was originally under the MIT license, but is now under the MPL 2.0
// license. The following license notice applies to only this file
//
// The MIT License (MIT)
//
// Copyright (c) 2014 Matthew Conlen
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// Adapted from the `command-exists` node module
// https://github.com/mathisonian/command-exists

import { execSync } from 'node:child_process'
import { accessSync, constants } from 'node:fs'
import path from 'node:path'

const onWindows = (process as any).platform == 'win32'

const fileNotExistsSync = (commandName: string): boolean => {
  try {
    accessSync(commandName, constants.F_OK)
    return false
  } catch {
    return true
  }
}

const localExecutableSync = (commandName: string): boolean => {
  try {
    accessSync(commandName, constants.F_OK | constants.X_OK)
    return true
  } catch {
    return false
  }
}

const commandExistsUnixSync = function (
  commandName: string,
  cleanedCommandName: string
): boolean {
  if (fileNotExistsSync(commandName)) {
    try {
      const stdout = execSync(
        'command -v ' +
          cleanedCommandName +
          ' 2>/dev/null' +
          ' && { echo >&1 ' +
          cleanedCommandName +
          '; exit 0; }'
      )
      return !!stdout
    } catch {
      return false
    }
  }
  return localExecutableSync(commandName)
}

const commandExistsWindowsSync = function (
  commandName: string,
  cleanedCommandName: string
): boolean {
  // Regex from Julio from: https://stackoverflow.com/questions/51494579/regex-windows-path-validator
  if (
    !/^(?!(?:.*\s|.*\.|\W+)$)(?:[A-Za-z]:)?(?:[^\n"*:<>?|]+(?:\/\/|\/|\\\\|\\)?)+$/m.test(
      commandName
    )
  ) {
    return false
  }
  try {
    const stdout = execSync('where ' + cleanedCommandName, { stdio: [] })
    return !!stdout
  } catch {
    return false
  }
}

function cleanInput(toBeCleaned: string): string {
  // Windows has a different cleaning process to Unix, so we should go through
  // that process first
  if (onWindows) {
    const isPathName = /\\/.test(toBeCleaned)
    if (isPathName) {
      const dirname = '"' + path.dirname(toBeCleaned) + '"'
      const basename = '"' + path.basename(toBeCleaned) + '"'
      return `${dirname}:${basename}`
    }

    return `"${toBeCleaned}"`
  }

  // Otherwise go through the unix cleaning process
  if (/[^\w/:=\\-]/.test(toBeCleaned)) {
    toBeCleaned = "'" + toBeCleaned.replace(/'/g, "'\\''") + "'"
    toBeCleaned = toBeCleaned
      .replace(/^(?:'')+/g, '') // unduplicate single-quote at the beginning
      .replace(/\\'''/g, "\\'") // remove non-escaped single-quote if there are enclosed between 2 escaped
  }

  return toBeCleaned
}

export function commandExistsSync(commandName: string): boolean {
  const cleanedCommandName = cleanInput(commandName)
  return onWindows
    ? commandExistsWindowsSync(commandName, cleanedCommandName)
    : commandExistsUnixSync(commandName, cleanedCommandName)
}
