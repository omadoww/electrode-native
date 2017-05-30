// @flow

import {
  Platform
} from '@walmart/ern-util'

exports.command = 'install <platformVersion>'
exports.desc = 'Install a given ern platform version'

exports.builder = {}

exports.handler = function (argv: any) {
  Platform.installPlatform(argv.platformVersion.toString().replace('v', ''))
}
