+++
title = "Including addons"
weight = 10
+++

# Including addons

Gluon provides an automated system for including extensions in your project. The addons are downloaded and included during the `download` build step. Addons can be included in the project config (`surfer.json`).

```json
{
  // Your options here
  "addons": {
    "ublock": {
      "id": "uBlock0@raymondhill.net",
      "url": "https://github.com/gorhill/uBlock/releases/download/1.39.0/uBlock0_1.39.0.firefox.xpi"
    }
  }
}
```

Note that the `id` is the gecko application id specified in the `manifest.json`.

```json
{
  // ...

  "browser_specific_settings": {
    "gecko": {
      "id": "uBlock0@raymondhill.net",
      "strict_min_version": "60.0"
    }
  }

  // ...
}
```

## Specifying location in customizable ui

By default, when adding an addon with a toolbar button, it will be placed next to the hamburger menu. However, you may want to place it somewhere else. To do this, you must change the customizable ui in a similar way to how you would when removing pocket.

You are going to want to open `engine/browser/components/customizableui/CustomizableUI.jsm`. At the top, you want to import the `ExtensionCommon` module.

```js
const { makeWidgetId } = ChromeUtils.import(
  'resource://gre/modules/ExtensionCommon.jsm'
).ExtensionCommon
```

Then, add a constant with the id of the addon at the top of the file, for example:

```js
const kUBlockOriginID = 'uBlock0@raymondhill.net'
```

Now, you can go down to the `navbarPlacements` array (around line 240) and add

```js
`${makeWidgetId(kUBlockOriginID)}-browser-action`,
```

To the array where you want the icon to appear, for example:

```js
let navbarPlacements = [
  'back-button',
  'forward-button',
  'stop-reload-button',
  Services.policies.isAllowed('removeHomeButtonByDefault')
    ? null
    : 'home-button',
  'spring',
  `${makeWidgetId(kUBlockOriginID)}-browser-action`,
  'urlbar-container',
  'spring',
  'save-to-pocket-button',
  'downloads-button',
  AppConstants.MOZ_DEV_EDITION ? 'developer-button' : null,
  'fxa-toolbar-menu-button',
].filter((name) => name)
```

Finally, export the changes you have made:

```sh
surfer export-file browser/components/customizableui/CustomizableUI.jsm
```
