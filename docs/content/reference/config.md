+++
title = "`surfer.json` Reference"
weight = 0
+++

# surfer.json Reference

This reference guide may get outdated. If you need to check something, you can read [the config interface type](https://github.com/zen-browser/surfer/blob/main/src/utils/config.ts#L96).

## name

This is the name of the product that is to be built.

```json
{
  "name": "Pulse Browser"
}
```

## vendor

The name of the company that is building the browser

```json
{
  "vendor": "Fushra"
}
```

## appId

A reverse DNS identifier for the browser

```json
{
  "appId": "com.fushra.browser"
}
```

## binaryName

The name of the output binary.

```json
{
  "binaryName": "zen-browser"
}
```

## updateHostname

The host of the update server for updating. This is configured as part of the build command

```json
{
  "updateHostname": "updates.pulsebrowser.app"
}
```

## license

Information about the license the browser will be under. This is used by the Gluon license checker to ensure files have the MPL header if specified.

Specification:

```ts
interface LicenseConfig {
  /**
   * What license you intend to put your project under. Currently MPL is the
   * only one supported by the license checker, but if you want implement more
   * please feel free to open a pull request.
   *
   * To disable the license checker, set this type to `unknown`
   */
  licenseType: 'MPL-2.0' | 'unknown'
  /**
   * Files to be ignored by the license checker. For default values see the
   * `defaultConfig` variable in the config.ts file
   *
   * These should be rejex tests because compiled regex tests are **really**
   * fast which will stop the license checker from becoming absurdly slow with
   * larger projects
   */
  ignoredFiles: string[]
}
```

Example:

```json
{
  "licenseType": "MPL-2.0",
  "ignoredFiles": [".*\\.json"]
}
```

Commands that maybe used:

```sh
surfer license-check
surfer lc # Alias
```

## version

Provides information to surfer about the product and version that Gluon is responsible for managing.

Specification:

```typescript
enum SupportedProducts {
  Firefox = 'firefox',
  FirefoxESR = 'firefox-esr',
  FirefoxESRNext = 'firefox-esr-next',
  FirefoxDev = 'firefox-dev',
  FirefoxBeta = 'firefox-beta',
  FirefoxNightly = 'firefox-nightly',
}

interface VersionConfig {
  /**
   * What branch of firefox you are forking. e.g. stable ('firefox'), dev ('firefox-dev')
   * , esr ('firefox-esr') etc.
   *
   * For use in code, use {@link SupportedProducts}
   */
  product: SupportedProducts
  /**
   * The version of the selected product you are forking
   */
  version?: string
}
```

Example

```json
{
  "version": {
    "product": "firefox",
    "version": "102.0.1"
  }
}
```

## buildOptions

These are flags that change how parts of Gluon operate.

### windowsUseSymbolicLinks

When set to `true`, symbolic links will be enabled on Windows. From internal testing, this appears to fail on a majority of computers

## addons

An index for each addon. These will be downloaded and configured as part of the `download` step that surfer performs. You can download extensions from AMO, Github or any URL. Note that the furha-robot will only be able to provide update checking to AMO and Github Extensions.

Specification:

```typescript
export interface GithubAddonInfo {
  platform: 'github'
  id: string
  repo: string
  version: string
  fileGlob: string
}

export interface AMOAddonInfo {
  platform: 'amo'
  id: string
  amoId: string
  version: string
}

export interface UrlAddonInfo {
  platform: 'url'
  version: string
  id: string
  url: string
}

export type AddonInfo = GithubAddonInfo | AMOAddonInfo | UrlAddonInfo

type addons = Record<string, AddonInfo>
```

Example:

```json
{
  "addons": {
    "ublock": {
      "platform": "github",
      "id": "uBlock0@raymondhill.net",
      "repo": "gorhill/uBlock",
      "version": "1.43.0",
      "fileGlob": "uBlock0_*.firefox.signed.xpi"
    },
    "tabliss": {
      "platform": "amo",
      "id": "extension@tabliss.io",
      "amoId": "850407",
      "version": "2.6.0"
    }
  }
}
```

Commands that use this:

```sh
surfer download
surfer updates-addons # Generates update manifests for addons
```

## brands

These are different distrobutions, for example, beta and stable.

Specification:

```typescript
export interface ReleaseInfo {
  /**
   * The version of your output product. E.g. 1.3.5
   */
  displayVersion: string
  github?: {
    repo: string
  }

  x86?: {
    windowsMar?: string
    macosMar?: string
    linuxMar?: string
  }
}

export interface BrandInfo {
  backgroundColor: string
  brandShorterName: string
  brandShortName: string
  brandFullName: string
  release: ReleaseInfo
}

type brands = Record<string, BrandInfo>
```

Example:

```json
{
  "brands": {
    "stable": {
      "backgroundColor": "#2B2A33",
      "brandShorterName": "Pulse",
      "brandShortName": "Pulse Browser",
      "brandFullName": "Pulse Browser",
      "release": {
        "displayVersion": "1.0.0",
        "github": {
          "repo": "zen-browser/desktop"
        },
        "x86": {
          "windowsMar": "windows.mar",
          "macosMar": "macosIntel.mar",
          "linuxMar": "linux.mar"
        }
      }
    },
    "beta": {
      "backgroundColor": "#2B2A33",
      "brandShorterName": "Pulse",
      "brandShortName": "Pulse Browser",
      "brandFullName": "Pulse Browser Beta",
      "release": {
        "displayVersion": "1.0.0-b.0",
        "github": {
          "repo": "zen-browser/desktop"
        },
        "x86": {
          "windowsMar": "windows.mar",
          "macosMar": "macosIntel.mar",
          "linuxMar": "linux.mar"
        }
      }
    },
    "alpha": {
      "backgroundColor": "#2B2A33",
      "brandShorterName": "Pulse",
      "brandShortName": "Pulse Browser",
      "brandFullName": "Pulse Browser Alpha",
      "release": {
        "displayVersion": "1.0.0-a.16",
        "github": {
          "repo": "zen-browser/desktop"
        },
        "x86": {
          "windowsMar": "windows.mar",
          "macosMar": "macosIntel.mar",
          "linuxMar": "linux.mar"
        }
      }
    }
  }
}
```

Commands:

```sh
surfer build
surfer package
surfer updates-browser
surfer set brand <brand_name>
```
