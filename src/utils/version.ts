// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
import axios from 'axios'
import { log } from '../log'
import { SupportedProducts } from './config'
import { config } from '..'
import { dynamicConfig } from '.'

const firefoxTargets = JSON.parse(`{
  "${SupportedProducts.Firefox}": "LATEST_FIREFOX_VERSION",
  "${SupportedProducts.FirefoxBeta}": "LATEST_FIREFOX_DEVEL_VERSION",
  "${SupportedProducts.FirefoxDevelopment}": "FIREFOX_DEVEDITION",
  "${SupportedProducts.FirefoxESR}": "FIREFOX_ESR",
  "${SupportedProducts.FirefoxNightly}": "FIREFOX_NIGHTLY"
}`)

export const shouldUseCandidate = (): boolean => {
  const brandingKey = dynamicConfig.get('brand')
  return (
    brandingKey !== 'release' &&
    config.version.version !== config.version.candidate
  )
}

export const getFFVersionOrCandidate = () => {
  return shouldUseCandidate()
    ? config.version.candidate
    : config.version.version
}

export const getLatestFF = async (
  product: SupportedProducts = SupportedProducts.Firefox
): Promise<string> => {
  try {
    const { data } = await axios.get(
      'https://product-details.mozilla.org/1.0/firefox_versions.json'
    )

    return data[firefoxTargets[product]]
  } catch (error) {
    log.warning('Failed to get latest firefox version with error:')
    log.error(error)

    return ''
  }
}
