// @flow

import {
  NativeApplicationDescriptor
} from '@walmart/ern-util'
import cauldron from '../../../lib/cauldron'

exports.command = 'dependencies <completeNapDescriptor>'
exports.desc = 'Get all the native dependencies of a given native application'

exports.builder = {}

exports.handler = function (argv: any) {
  const napDescriptor = NativeApplicationDescriptor.fromString(argv.completeNapDescriptor)
  cauldron.getNativeDependencies(napDescriptor, { convertToObjects: false }).then(res => {
    log.info(JSON.stringify(res, null, 1))
  })
}
