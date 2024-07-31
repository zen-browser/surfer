import { config } from '..'

const otherBuildModes = `# You can change to other build modes by running:
#   $ surfer set buildMode [dev|debug|release]`

const platformOptimize = getPlatformOptimiseFlags()

export const internalMozconfg = (
  brand: string,
  buildMode: 'dev' | 'debug' | 'release' | string
) => {
  let buildOptions = `# Unknown build mode ${buildMode}`

  // Get the specific build options for the current build mode
  switch (buildMode) {
    case 'dev': {
      buildOptions = `# Development build settings
${otherBuildModes}
ac_add_options --disable-debug`
      break
    }
    case 'debug': {
      buildOptions = `# Debug build settings
${otherBuildModes}
ac_add_options --enable-debug
ac_add_options --disable-optimize`
      break
    }

    case 'release': {
      buildOptions = `# Release build settings
ac_add_options --disable-debug
ac_add_options --enable-optimize
ac_add_options --enable-rust-simd
${platformOptimize} # Taken from waterfox`
      break
    }
  }

  return `
# =====================
# Internal surfer config
# =====================

${buildOptions}
ac_add_options --disable-geckodriver
ac_add_options --disable-profiling
ac_add_options --disable-tests

# Custom branding
ac_add_options --with-branding=browser/branding/${brand}

# Config for updates
ac_add_options --enable-unverified-updates
ac_add_options --enable-update-channel=${brand}
export MOZ_APPUPDATE_HOST=${
    config.updateHostname || 'localhost:7648 # This should not resolve'
  }
`
}

function getPlatformOptimiseFlags(): string {
  let optimiseFlags = `# Unknown platform ${(process as any).surferPlatform}`
  if (process.env.ZEN_GA_GENERATE_PROFILE === '1') {
    return `ac_add_options --enable-optimize="-O2 -w"`
  }

  switch ((process as any).surferPlatform) {
    case 'linux': {
      optimiseFlags = `ac_add_options --enable-optimize="-march=nehalem -msse3 -mtune=znver3 -O3 -w -mavx -maes"`
      break
    }
    case 'darwin': {
      optimiseFlags = `ac_add_options --enable-optimize="-mcpu=apple-m1 -O3 -w"`
      break
    }
    case 'win32': {
      optimiseFlags = `ac_add_options --enable-optimize="-march=x86-64-v3 -Qvec -w -ftree-vectorize -msse3 -mssse3 -msse4.1 -mtune=haswell -mavx -maes"`
      break
    }
  }

  return optimiseFlags
}
