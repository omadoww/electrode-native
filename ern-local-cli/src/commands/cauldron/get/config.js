// @flow

import {
  NativeApplicationDescriptor
} from 'ern-util'
import {
  cauldron
} from 'ern-core'
import utils from '../../../lib/utils'

exports.command = 'config <descriptor>'
exports.desc = 'Get configuration from the cauldron'

exports.builder = function (yargs: any) {
  return yargs.epilog(utils.epilog(exports))
}

exports.handler = async function ({
  descriptor
} : {
  descriptor: string
}) {
  await utils.logErrorAndExitIfNotSatisfied({
    cauldronIsActive: {
      extraErrorMessage: 'A Cauldron must be active in order to use this command'
    }
  })

  const config = await cauldron.getConfig(NativeApplicationDescriptor.fromString(descriptor))
  log.info(JSON.stringify(config, null, 2))
}
