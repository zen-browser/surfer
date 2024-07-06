// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { copyFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'

import prompts from 'prompts'
import { BIN_NAME } from '../constants'

import { log } from '../log'
import {
  Config,
  configPath,
  delay,
  getLatestFF,
  projectDirectory,
  SupportedProducts,
  walkDirectory,
} from '../utils'

// =============================================================================
// User interaction portion

export async function setupProject(): Promise<void> {
  try {
    if (existsSync(configPath)) {
      log.warning('There is already a config file. This will overwrite it!')
      await delay(1000)
    }

    if (configPath.includes('.optional')) {
      log.error(
        'The text ".optional" cannot be in the path to your custom browser'
      )
      process.exit(1)
    }

    // Ask user for assorted information
    const { product } = await prompts({
      type: 'select',
      name: 'product',
      message: 'Select a product to fork',
      choices: [
        {
          title: 'Firefox stable',
          description: 'Releases around every 4 weeks, fairly stable',
          value: SupportedProducts.Firefox,
        },
        {
          title: 'Firefox extended support (older)',
          description:
            'The extended support version of Firefox. Will receive security updates for a longer period of time and less frequent, bigger, feature updates',
          value: SupportedProducts.FirefoxESR,
        },
        {
          title: 'Firefox developer edition (Not recommended)',
          description: 'Tracks firefox beta, with a few config tweaks',
          value: SupportedProducts.FirefoxDevelopment,
        },
        {
          title: 'Firefox beta (Not recommended)',
          description: 'Updates every 4 weeks. It will have unresolved bugs',
          value: SupportedProducts.FirefoxBeta,
        },
        {
          title: 'Firefox Nightly (Not recommended)',
          description:
            'Updates daily, with many bugs. Practically impossible to track',
          value: SupportedProducts.FirefoxNightly,
        },
      ],
    })

    if (typeof product === 'undefined') return

    const productVersion = await getLatestFF(product)

    const { version, name, appId, vendor, ui, binaryName } = await prompts([
      {
        type: 'text',
        name: 'version',
        message: 'Enter the version of this product',
        initial: productVersion,
      },
      {
        type: 'text',
        name: 'name',
        message: 'Enter a product name',
        initial: 'Example browser',
      },
      {
        type: 'text',
        name: 'binaryName',
        message: 'Enter the name of the binary',
        initial: 'example-browser',
      },
      {
        type: 'text',
        name: 'vendor',
        message: 'Enter a vendor',
        initial: 'Example company',
      },
      {
        type: 'text',
        name: 'appId',
        message: 'Enter an appid',
        initial: 'com.example.browser',
        // Horrible validation to make sure people don't chose something entirely wrong
        validate: (t: string) => t.includes('.'),
      },
      {
        type: 'select',
        name: 'ui',
        message: 'Select a ui mode template',
        choices: [
          {
            title: 'None',
            description:
              'No files for the ui will be created, we will let you find that out on your own',
            value: 'none',
          },
          {
            title: 'UserChrome',
            value: 'uc',
          },
          // TODO: We also need to add extension based theming like the version
          // used in Pulse Browser
        ],
      },
    ])

    const config: Partial<Config> = {
      name,
      vendor,
      appId,
      binaryName,
      version: { product, version },
      buildOptions: {
        windowsUseSymbolicLinks: false,
      },
    }

    await copyRequired()

    if (ui === 'uc') {
      await copyOptional(['browser/themes'])
    }

    writeFileSync(configPath, JSON.stringify(config, undefined, 2))

    // Append important stuff to gitignore
    const gitignore = join(projectDirectory, '.gitignore')
    let gitignoreContents = ''

    if (existsSync(gitignore)) {
      gitignoreContents = readFileSync(gitignore).toString()
    }

    gitignoreContents +=
      '\n.dotbuild/\n.surfer/\nengine/\nfirefox-*/\nnode_modules/\n'

    writeFileSync(gitignore, gitignoreContents)

    log.success(
      'Project setup complete!',
      '',
      `You can start downloading the Firefox source code by running |${BIN_NAME} download|`,
      'Or you can follow the getting started guide at https://docs.surfer.dev/getting-started/overview/'
    )
  } catch (error) {
    log.error(error)
  }
}

// =============================================================================
// Filesystem templating

// eslint-disable-next-line unicorn/prefer-module
export const templateDirectory = join(__dirname, '../..', 'template')

/**
 * Copy files from the template directory that have .optional in their path,
 * based on the function parameters
 *
 * @param files The files that should be coppied
 */
async function copyOptional(files: string[]) {
  const directoryContents = await walkDirectory(templateDirectory)
  for (const file of directoryContents) {
    if (shouldSkipOptionalCopy(file, files)) continue

    const outLocation = join(
      projectDirectory,
      file.replace(templateDirectory, '')
    ).replace('.optional', '')

    if (!existsSync(outLocation)) {
      mkdirSync(dirname(outLocation), { recursive: true })
      await copyFile(file, outLocation)
    }
  }
}

/**
 * Used to determine if a file should be copied or not. This is exported only so
 * that it can be unit tested
 *
 * @param file The file that should be copied
 * @param files A list of files / directories that we want to match to
 * @returns If the file should be skipped
 *
 * @private
 */
export function shouldSkipOptionalCopy(file: string, files: string[]): boolean {
  // We want to skip copying this file if:
  // - It is not optional
  // - It is not in the files array
  return (
    !file.includes('.optional') ||
    !files.map((f) => file.includes(f)).some(Boolean)
  )
}

/**
 * Copy all non-optional files from the template directory
 */
async function copyRequired() {
  const directoryContents = await walkDirectory(templateDirectory)

  for (const file of directoryContents) {
    if (file.includes('.optional')) continue
    const outLocation = join(
      projectDirectory,
      file.replace(templateDirectory, '')
    )

    if (!existsSync(outLocation)) {
      mkdirSync(dirname(outLocation), { recursive: true })
      await copyFile(file, outLocation)
    }
  }
}
