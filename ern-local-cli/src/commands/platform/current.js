import {
  platform
} from '@walmart/ern-util'

exports.command = 'current'
exports.desc = 'Show current platform version'

exports.builder = {}

exports.handler = function (argv) {
  log.info(`Platform version : v${platform.currentVersion}`)
}
