// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
import * as config from '../utils/config'
import { getFFVersion } from './ff-version'

describe('getFFVersion', () => {
  it('Returns not specified with an empty config', () => {
    const log = jest.spyOn(console, 'log')
    config.setMockRawConfig('{}')

    getFFVersion()

    expect(log).toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith('Not Specified')

    log.mockRestore()
  })

  it('Returns the version from the config', () => {
    const log = jest.spyOn(console, 'log')
    config.setMockRawConfig(
      `{"version": { "version": "1.2.3", "product": "firefox" }}`
    )

    getFFVersion()

    expect(log).toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith('1.2.3')

    log.mockRestore()
  })
})
