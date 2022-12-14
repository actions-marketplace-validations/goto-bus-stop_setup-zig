const os = require('os')
const path = require('path')
const semver = require('semver')
const actions = require('@actions/core')
const cache = require('@actions/tool-cache')
const {
  extForPlatform,
  resolveCommit,
  resolveVersion
} = require('./versions')

async function downloadZig (platform, version) {
  const ext = extForPlatform(platform)

  const { downloadUrl, variantName } = version.includes('+')
    ? resolveCommit(platform, version)
    : await resolveVersion(platform, version)

  const downloadPath = await cache.downloadTool(downloadUrl)
  const zigPath = ext === 'zip'
    ? await cache.extractZip(downloadPath)
    : await cache.extractTar(downloadPath, undefined, 'x')

  const binPath = path.join(zigPath, variantName)
  const cachePath = await cache.cacheDir(binPath, 'zig', variantName)

  return cachePath
}

async function main () {
  const version = actions.getInput('version') || 'master'
  if (semver.valid(version) && semver.lt(version, '0.3.0')) {
    actions.setFailed('This action does not work with Zig 0.1.0 and Zig 0.2.0')
    return
  }

  let zigPath = cache.find('zig', version)
  if (!zigPath) {
    zigPath = await downloadZig(os.platform(), version)
  }

  // Add the `zig` binary to the $PATH
  actions.addPath(zigPath)
}

main().catch((err) => {
  console.error(err.stack)
  actions.setFailed(err.message)
  process.exit(1)
})
