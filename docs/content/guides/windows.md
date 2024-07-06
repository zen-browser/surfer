+++
title = "Preparing Windows"
weight = 0
+++

# Preparing Windows

Building on windows is significantly more complex than building on macos or linux. This guide will walk you through preparing your Windows machine for building a Firefox fork. Before building, you should be aware that [only Windows 10 or 11 are officially supported](https://firefox-source-docs.mozilla.org/build/buildsystem/supported-configurations.html#build-hosts), but you might be able to get other versions to work.

## Installing Dependencies

The first thing you will need to do is install Microsoft's c++ build tools. You will need to download [Build Tools for Visual Studio 2022](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022). The following will need to be installed:

- **In the _Workloads_ tab**
  - Desktop development with C++
- **In the _Individual components_ tab**
  - MSVC v143 - VS 2022 C++ x64/x86 build tools.
  - Windows 10 SDK (at least 10.0.19041.0).
  - C++ ATL for v143 build tools (x86 and x64).

> **Note:**
> If this guide ever gets out of date, you can get the latest build requirements from [Mozilla's docs](https://firefox-source-docs.mozilla.org/setup/windows_build.html#system-preparation)

You will need to install [MozillaBuild](https://ftp.mozilla.org/pub/mozilla/libraries/win32/MozillaBuildSetup-Latest.exe). Next, [install Git](https://git-scm.com/download/win). You will need to set the following specific options on install to ensure high performance:

- Configuring the line ending conversions must be: Checkout as-is, commit as-is
- Enable experimental built-in file system monitor

Install [NodeJS](https://nodejs.org/en/download/current/) on your system. This should also install chocolatey. If it does not, [install it manually](https://docs.chocolatey.org/en-us/choco/setup). To install the final two dependencies, run:

```sh
npm install --global yarn
choco install make
```

You should be good to return back to the main [Getting Started docs](/getting-started/overview)

## Additional packages required for releasing

If you are creating binaries to target windows, you will need nsis (which mach calls `makensisu` for some reason, even though the binary is `makensis`):

```powershell
choco install nsis
```

Note that you will also have to provide a path to nsis on your system. For mine it is:

```sh
export MAKENSISU="C:\\Program Files (x86)\\NSIS\\Bin\\makensis.exe"
```
