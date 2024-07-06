+++
title = "Automatic updates"
weight = 20
+++

# Automatic updates

> **Note**
> Automatic updates only works for browsers using GitHub to host their binaries.

Mozilla provides an automatic update service that can be used by anyone building a Firefox fork or any other application that depends on Mozilla toolkit.

Attached to your "brand", you will need to include information regarding that brand's release. For example, Pulse has the following information attached to its alpha brand.

```json
{
  ...,
  "brands": {
    ...,
    "alpha": {
      ...,

      "release": {
        "displayVersion": "1.0.0-a.17",
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
  },
  ...
}
```

The release key includes both the latest version (`displayVersion`) and release info. In this case, binaries are released to github. For `x86`, we provide a number of `.mar` files for each platform. `.mar` files are "Mozilla Archives" and are used to distribute updates.

When creating update manifests, they will point to [the release tagged `displayVersion`](https://github.com/zen-browser/desktop/releases/tag/1.0.0-a.17). The update manifests tell Mozilla's updater to download the update manifest with the version that corresponds with the file name above. So an x86 linux computer will download the `linux.mar` file and use that to update.

## Creating MAR files and update manifests

Both `.mar` files and the update manifests are automatically created by running `surfer package`. This will generate a number of files in the `dist` directory.

An `output.mar` will be included in the root, which you should rename to the appropriate platform. For example, `linux.mar` for linux. This should be included with your GitHub release.

Update manifests are stored in the `dist/update` directory. The contents of this directory should be uploaded to a webserver (e.g. GitHub Pages or S3) such that their root is at `/updates/browser/`.

You will then need to set the `updateHostname` in `surfer.json` to the url of your update server. For Pulse, this is `updates.pulsebrowser.app`. You may also need to change the update server specified [here](https://searchfox.org/mozilla-central/rev/560b7b1b174ed36912b969eee0c1920f3c59bc56/build/moz.build#94).
