import {
  explodeNapSelector
} from '@walmart/ern-util'
import cauldron from '../../../lib/cauldron'

const log = require('console-log-level')()

exports.command = 'nativeapp <napSelector>'
exports.desc = 'Get a native application from the cauldron'

exports.builder = {}

exports.handler = function (argv) {
  cauldron.getNativeApp(
    ...explodeNapSelector(argv.napSelector)).then(res => {
      log.info(JSON.stringify(res, null, 1))
    })
}
