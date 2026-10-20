// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import {
  configPath,
  defaultConfig,
  getConfig,
  hasConfig,
  rawConfig,
} from './config'

export function preserveExistingConfig(): void {
  let configExists = false
  let configContents = ''

  beforeAll(() => {
    if (existsSync(configPath)) {
      configContents = readFileSync(configPath, 'utf8')
      configExists = true
      unlinkSync(configPath)
    }
  })

  afterAll(() => {
    if (configExists) {
      writeFileSync(configPath, configContents)
    }
  })
}

describe('hasConfig', () => {
  preserveExistingConfig()

  it('returns false when the config file does not exist', () =>
    expect(hasConfig()).toBe(false))

  it('returns true when the config file exists', () => {
    writeFileSync(configPath, '{}')
    expect(hasConfig()).toBe(true)
    unlinkSync(configPath)
  })
})

describe('rawConfig', () => {
  preserveExistingConfig()

  it('Returns "{}" when no config exists', () => expect(rawConfig()).toBe('{}'))

  it('Returns the contents of the config file', () => {
    writeFileSync(configPath, '{"test": "val"}')
    expect(rawConfig()).toBe('{"test": "val"}')
    unlinkSync(configPath)
  })
})

describe('getConfig', () => {
  preserveExistingConfig()

  it('Returns the default config when none exists', () =>
    expect(getConfig()).toEqual(defaultConfig))

  it('Returns the default config when the config is empty', () => {
    writeFileSync(configPath, '{}')
    expect(getConfig()).toEqual(defaultConfig)
    unlinkSync(configPath)
  })

  it('Returns a merged config when there is a specified value', () => {
    writeFileSync(configPath, '{"name": "val"}')
    expect(getConfig()).toEqual({ ...defaultConfig, name: 'val' })
    unlinkSync(configPath)
  })

  it('Throws an error if there is invalid JSON', () => {
    writeFileSync(configPath, '{invalid json')
    expect(() => getConfig()).toThrow()
    unlinkSync(configPath)
  })

  it('Throws an error if the product is invalid', () => {
    writeFileSync(configPath, '{"version": {"product": "invalid"}}')
    expect(() => getConfig()).toThrow()
    unlinkSync(configPath)
  })
})
