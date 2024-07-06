+++
title = "Understanding the file structure"
weight = 10
+++

# Understanding the file structure

Lets take a look at the file structure of your project. It should look something like this:

```filesystem
├─  .gitignore
├─  surfer.json
├─  configs
│   ├─  common
│   │   └─  mozconfig
│   ├─  linux
│   │   └─  mozconfig
│   ├─  macos
│   │   └─  mozconfig
│   └─  windows
│       └─  mozconfig
├─  src
│   ├─  README.md
│   └─  browser
│       └─  themes
│           ├─  custom
│           │   ├─  linux
│           │   │   └─  linux.inc.css
│           │   ├─  macos
│           │   │   └─  macos.inc.css
│           │   ├─  shared
│           │   │   └─  shared.inc.css
│           │   └─  windows
│           │       └─  windows.inc.css
│           ├─  linux
│           │   ├─  browser-css.patch
│           │   └─  jar-mn.patch
│           ├─  osx
│           │   ├─  browser-css.patch
│           │   └─  jar-mn.patch
│           ├─  shared
│           │   ├─  browser-shared-css.patch
│           │   └─  jar-inc-mn.patch
│           └─  windows
│               ├─  browser-css.patch
│               └─  jar-mn.patch
├─  .surfer
│   └─  ...
└─  engine
    └─  ...
```

Whilst this may seem large (especially if you look inside of the `engine`) directory, it is all fairly manageable.

## surfer.json

The primary configuration file for your project is the `surfer.json` file. This is where you will put information about your browser so Gluon can build it correctly. It should look something like this:

```json
{
  "name": "Gluon Example Browser",
  "vendor": "Fushra",
  "appId": "dev.surfer.example",
  "binaryName": "surfer-example-browser",

  "version": {
    "product": "firefox",
    "version": "102.0.1"
  },

  "buildOptions": {
    "windowsUseSymbolicLinks": false
  }
}
```

Up the top of the config file, we have general information about the browser you are building. This includes its name, the vendor creating it, its appId, and the name of the binary that will be output.

The `version` key is used to specify information about the product you are building. `product` is the Firefox branch you are building against. `version` is the version of Firefox you are building against, which will vary with the branch. Here `firefox` refers to the stable branch of Firefox.

`buildOptions` provides a number of internal toggles for how Gluon builds your project.

## Configs

The configs folder stores a combination of config files that are required by Firefox and assets required by Gluon. By default there are only [`mozconfig` files](https://firefox-source-docs.mozilla.org/build/buildsystem/mozconfigs.html), Gluon should generate most parts of this config for you. The only part that you will need to change is the source control repo:

```bash
ac_add_options --with-app-name=${binName}
export MOZ_USER_DIR="${name}"
export MOZ_APP_VENDOR="${vendor}"
export MOZ_APP_BASENAME=${binName}
export MOZ_APP_PROFILE=${binName}
export MOZ_APP_DISPLAYNAME="${name}"
export MOZ_MACBUNDLE_ID=${appId}
export MOZ_DISTRIBUTION_ID=${appId}

# Uncomment if builds are too resource hungry
# mk_add_options MOZ_MAKE_FLAGS="-j4"
# ac_add_options --enable-linker=gold

# Misc
export MOZ_STUB_INSTALLER=1
export MOZ_INCLUDE_SOURCE_INFO=1
export MOZ_SOURCE_REPO=https://github.com/dothq/browser-desktop # <-- Change this!
export MOZ_SOURCE_CHANGESET=${changeset}
```

This directory is also where you would put [branding assets for your browser](/guides/branding)

## src/

The source folder contains all of the modifications that you have made to Firefox. These come in two types, inserted files (and folders) and patches. Both of these are applied using the `surfer import` command.

Inserted files are just files (and folders) that you have inserted into the Firefox source code. These will overwrite existing files if they already exist. On Linux and MacOS, these are symlinked so when you change a file in `src/`, the change will be mirrored in Firefox's source code instantly. On Windows, you will need to run `surfer import` for these changes to apply.

Patches are changes to Firefox's files. As a rule of thumb, you should prefer splitting new content into a new file rather than using patches, but there are times when you must modify Firefox's source code. Each of these patch files are just git patch files:

```patch
diff --git a/browser/themes/linux/jar.mn b/browser/themes/linux/jar.mn
index 404a88b218c652afac0cb2004676d22da53d48f3..5a4668ef2970dd773536907f51f3e7e7e3e023cb 100644
--- a/browser/themes/linux/jar.mn
+++ b/browser/themes/linux/jar.mn
@@ -6,7 +6,7 @@ browser.jar:
 % skin browser classic/1.0 %skin/classic/browser/
 #include ../shared/jar.inc.mn
   skin/classic/browser/sanitizeDialog.css
-  skin/classic/browser/browser.css
+* skin/classic/browser/browser.css
   skin/classic/browser/contextmenu.css                (../shared/contextmenu.css)
   skin/classic/browser/monitor-base.png
   skin/classic/browser/monitor-border.png
```

In this patch, you can see that I am adding a `*` to the start of a line. You generate these patches by modifying the file in the `engine/` directory and running `surfer export` to export your changes to the src directory. Be careful, if you do not export your changes, they will not be saved and will not work on other developers' computers or yours after an update!

```sh
surfer export browser/themes/linux/jar.mn
```

## engine/

The engine directory contains all of Firefox's source code. It is massive - around 15GB in size (around 11GB of that are build assets from when you run `surfer build`). I am not able to provide a full explanation of the contents of the directory.

However, most of the changes you will want to make will be in `engine/browser/`, which contains the source code for the browser's UI. Here are some of the important directories inside of the `engine/browser/` directory:

- [`engine/browser/base/content`](https://searchfox.org/mozilla-central/source/browser/base/content): These contain the xhtml files that make up a majority of the browser's ui
- [`engine/browser/components`](https://searchfox.org/mozilla-central/source/browser/components): This contains some self-contained UI features, like screenshots, uitours, downloads, etc.
- [`engine/browser/themes`](https://searchfox.org/mozilla-central/source/browser/themes): Here lies most of the browsers CSS. See [Customizing Your Browser's UI](/getting-started/userchrome) for more information.

One of the best ways to find what you are looking for and get to know the code base is by searching it. However, if you try and search through it on your computer you are in for a world of pain. Instead, I recommend you use [SearchFox](https://searchfox.org), which is significantly faster.
