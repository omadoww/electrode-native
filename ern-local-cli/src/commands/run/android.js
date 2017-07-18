// @flow

import {
  MiniApp
} from '@walmart/ern-core'

exports.command = 'android'
exports.desc = 'Run miniapp in android runner project'

exports.builder = function (yargs: any) {
  return yargs
}

exports.handler = async function () {
  try {
    MiniApp.fromCurrentPath().runInAndroidRunner()
  } catch (e) {
    log.error(`${e}`)
  }
}
