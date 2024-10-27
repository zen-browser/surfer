// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import glob from 'tiny-glob'

import { ENGINE_DIR, PATCHES_DIR, SRC_DIR } from '../../constants'
import * as gitPatch from './git-patch'
import * as copyPatch from './copy-patches'
import * as brandingPatch from './branding-patch'
import { patchCountFile } from '../../middleware/patch-check'
import { checkHash } from '../../utils'
import { Task, TaskList } from '../../utils/task-list'
import { writeFile } from 'node:fs/promises'

export interface IMelonPatch {
  name: string
  skip?: () => boolean | Promise<boolean>
}

function patchMethod<T extends IMelonPatch>(
  name: string,
  patches: T[],
  patchFunction: (patch: T, index: number) => Promise<void>
): Task {
  return {
    name: `Apply ${patches.length} ${name} patches`,
    long: true,
    task: () =>
      new TaskList(
        patches.map((patch, index) => ({
          name: `Apply ${patch.name}`,
          task: () => patchFunction(patch, index),
          skip: patch.skip,
        }))
      ),
  }
}

function importMelonPatches(): Task {
  return patchMethod(
    'branding',
    [
      ...(brandingPatch.get().map((name) => ({
        type: 'branding',
        name,
        value: name,
        skip: async () => {
          const logoCheck = checkHash(
            join(brandingPatch.BRANDING_DIR, name, 'logo.png')
          )
          const macosInstallerCheck = checkHash(
            join(brandingPatch.BRANDING_DIR, name, 'MacOSInstaller.svg')
          )

          if (
            (await logoCheck) &&
            (await macosInstallerCheck) &&
            existsSync(join(ENGINE_DIR, 'browser/branding', name))
          ) {
            return true
          }

          return false
        },
      })) as brandingPatch.IBrandingPatch[]),
    ],
    async (patch) => await brandingPatch.apply(patch.value as string)
  )
}

async function importFolders(): Promise<Task> {
  return patchMethod(
    'folder',
    await copyPatch.get(),
    async (patch) => await copyPatch.apply(patch.src)
  )
}

async function importGitPatch(): Promise<Task> {
  let patches = await glob('**/*.patch', {
    filesOnly: true,
    cwd: SRC_DIR,
  })
  patches = patches.map((path) => join(SRC_DIR, path))

  await writeFile(patchCountFile, patches.length.toString())

  return patchMethod<gitPatch.IGitPatch>(
    'git',
    patches.map((path) => ({ name: path, path })),
    async (patch) => await gitPatch.apply(patch.path)
  )
}

async function importInternalPatch(): Promise<Task> {
  const patches = await glob('*.patch', {
    filesOnly: true,
    cwd: PATCHES_DIR,
  })
  const structuredPatches = patches.map((path) => ({
    name: path,
    path: join(PATCHES_DIR, path),
  }))

  return patchMethod<gitPatch.IGitPatch>(
    'surfer',
    structuredPatches,
    async (patch) => await gitPatch.apply(patch.path)
  )
}

export async function applyPatches(): Promise<void> {
  const canDoBrandingPatch = process.env.SURFER_NO_BRANDING_PATCH !== 'true'
  let tasks = [
    await importInternalPatch(),
    canDoBrandingPatch ? importMelonPatches() : undefined,
    await importFolders(),
    await importGitPatch(),
  ].filter((task) => task !== undefined) as Task[]
  await new TaskList(tasks).run()
}
