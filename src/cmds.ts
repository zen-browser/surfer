// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/* eslint-disable unicorn/no-await-expression-member */

import { Cmd } from './types'

export const commands: Cmd[] = [
  {
    cmd: 'bootstrap',
    description: 'Bootstrap the surfer app.',
    requestController: async () =>
      (await import('./commands/bootstrap')).bootstrap,
  },
  {
    cmd: 'build',
    aliases: ['b'],
    description:
      'Build the surfer app. Specify the OS param for cross-platform builds.',
    options: [
      {
        arg: '--u, --ui',
        description:
          'Only builds the ui. Faster but not as powerful as a regular build.',
      },
      {
        arg: '--skip-patch-check',
        description:
          "Doesn't check to see if all of the patches have been applied",
      },
    ],
    requestController: async () => (await import('./commands/build')).build,
  },
  {
    cmd: 'config <key> [value]',
    aliases: ['set', 'get'],
    description: 'Get and set the dynamic config from this project',
    requestController: async () => (await import('./commands/set')).set,
    disableMiddleware: true,
  },
  {
    cmd: 'ci',
    description: 'Configure the CI',
    requestController: async () => (await import('./commands/ci')).ci,
    options: [
      {
        arg: '--brand <brand>',
        description: 'Set the brand that the build is using',
      },
      {
        arg: '--bump <section>',
        description: 'What version should be bumped',
      },
      {
        arg: '--display-version <version>',
        description: 'Bind this CI instance to a specific version',
      },
    ],
  },
  {
    cmd: 'discard <file>',
    description: 'Discard a files changes.',
    requestController: async () => (await import('./commands/discard')).discard,
  },
  {
    cmd: 'download',
    description: 'Download Firefox.',
    options: [
      {
        arg: '--force',
        description: 'Delete the engine directory if it already exists',
      },
    ],
    requestController: async () =>
      (await import('./commands/download')).download,
  },
  {
    cmd: 'update',
    aliases: ['update-ff'],
    description: 'Update Firefox to latest version.',
    requestController: async () => (await import('./commands/update')).update,
    disableMiddleware: true,
  },
  {
    cmd: 'execute',
    description: 'Execute a command inside the engine directory.',
    requestController: async () => (await import('./commands/execute')).execute,
  },
  {
    cmd: 'export-file <file>',
    aliases: ['export'],
    description: 'Export a changed file as a patch.',
    requestController: async () =>
      (await import('./commands/export-file')).exportFile,
  },
  {
    cmd: 'import',
    aliases: ['import-patches', 'i'],
    description: 'Import patches into the browser.',
    requestController: async () =>
      (await import('./commands/patches')).applyPatches,
  },
  {
    cmd: 'ff-init <source>',
    aliases: ['ff-initialise', 'ff-initialize'],
    description: 'Initialise the Firefox directory.',
    requestController: async () => (await import('./commands/init')).init,
  },
  {
    cmd: 'ff-version',
    description: 'Retrieves the version of firefox to build against',
    requestController: async () =>
      (await import('./commands/ff-version')).getFFVersion,
  },
  {
    cmd: 'license-check',
    aliases: ['lc'],
    options: [
      {
        arg: '--fix',
        description: "Will add MPL-2.0 headers to files that don't have it",
      },
    ],
    description: 'Check the src directory for the absence of MPL-2.0 header.',
    requestController: async () =>
      (await import('./commands/license-check')).licenseCheck,
  },
  {
    cmd: 'package',
    aliases: ['pack'],
    description: 'Package the browser for distribution.',
    requestController: async () =>
      (await import('./commands/package')).surferPackage,
  },
  {
    cmd: 'reset',
    description: 'Reset the source directory to stock Firefox.',
    requestController: async () => (await import('./commands/reset')).reset,
  },
  {
    cmd: 'run [chrome]',
    aliases: ['r', 'open'],
    description: 'Run the browser.',
    requestController: async () => (await import('./commands/run')).run,
  },
  {
    cmd: 'setup-project',
    description: 'Sets up a surfer project for the first time',
    requestController: async () =>
      (await import('./commands/setup-project')).setupProject,
  },
  {
    cmd: 'status',
    description: 'Status and files changed for src directory.',
    requestController: async () => (await import('./commands/status')).status,
  },
  {
    cmd: 'updates-browser',
    description:
      'Generate update manifest for the browser binary. This should be run after packaging',
    requestController: async () =>
      (await import('./commands/updates/browser')).generateBrowserUpdateFiles,
  },
  {
    cmd: 'updates-addons',
    description:
      'Generates update manifests for system addons that are included in the browser',
    requestController: async () =>
      (await import('./commands/updates/addons')).generateAddonUpdateFiles,
  },
]
