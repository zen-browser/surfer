+++
title = "Removing pocket"
weight = 5
+++

# Removing pocket

**Note:** This expects you have surfer setup.

## Disabling in firefox.js

The goal of this guide is to disable pocket and remove its icon from the toolbar. The first changes we will need to make is to the firefox.js file located in `engine/browser/app/profile/firefox.js`. Scroll to the lines that include the following settings (around line 1980 in firefox 94):

```js
pref('extensions.pocket.api', 'api.getpocket.com')
pref('extensions.pocket.enabled', true)
pref('extensions.pocket.oAuthConsumerKey', '40249-e88c401e1b1f2242d9e441c4')
pref('extensions.pocket.site', 'getpocket.com')
pref('extensions.pocket.onSaveRecs', true)
pref('extensions.pocket.onSaveRecs.locales', 'en-US,en-GB,en-CA')
```

Delete these lines and replace them with the following:

```js
// Taken from BetterFox user.js
user_pref('extensions.pocket.enabled', false)
user_pref('extensions.pocket.api', ' ')
user_pref('extensions.pocket.oAuthConsumerKey', ' ')
user_pref('extensions.pocket.site', ' ')
```

Next, you will need to remove pocket from the new tab page. You can do this by simply adding the following line to the bottom of `firefox.js`:

```js
user_pref(
  'browser.newtabpage.activity-stream.section.highlights.includePocket',
  false
)
```

Now you simply need to export the changes made to `firefox.js`:

```sh
surfer export-file browser/app/profile/firefox.js
```

## Removing pocket icon from toolbar

Whilst the steps above will have disabled pocket. The pocket icon will still be visible in the toolbar. Instead you must remove it from the CustomizableUI layout. Open `engine/browser/components/customizableui/CustomizableUI.jsm` and find the array that looks like this (around line 240):

```js
let navbarPlacements = [
  'back-button',
  'forward-button',
  'stop-reload-button',
  Services.policies.isAllowed('removeHomeButtonByDefault')
    ? null
    : 'home-button',
  'spring',
  'urlbar-container',
  'spring',
  'save-to-pocket-button',
  'downloads-button',
  AppConstants.MOZ_DEV_EDITION ? 'developer-button' : null,
  'fxa-toolbar-menu-button',
].filter((name) => name)
```

Remove the `save-to-pocket-button` item from the array and export the changes:

```sh
surfer export-file browser/components/customizableui/CustomizableUI.jsm
```
