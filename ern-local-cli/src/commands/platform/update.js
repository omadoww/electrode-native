// @flow

import {
  Platform
} from '@walmart/ern-util'
import {
  execSync
} from 'child_process'

exports.command = 'update'
exports.desc = 'Update currently activated platform version'

exports.builder = {}

exports.handler = function () {
  const platformVersionPath = Platform.currentPlatformVersionPath
  const platformVersion = Platform.currentVersion

  if (platformVersion === '1000') {
    return console.log('Development version (v1000) cannot be updated through this command')
  }

  process.chdir(platformVersionPath)
  execSync(`git reset --hard`)
  execSync(`git pull origin v${platformVersion}`)
  execSync(`yarn install`)
  execSync(`npm run rebuild`)

  console.log('Update complete')
}
