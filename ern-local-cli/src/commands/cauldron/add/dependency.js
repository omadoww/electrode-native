// @flow

import {
  Dependency,
  NativeApplicationDescriptor
} from 'ern-util'
import {
  cauldron
} from 'ern-core'
import semver from 'semver'
import {
  runCauldronContainerGen
} from '../../../lib/publication'
import _ from 'lodash'
import inquirer from 'inquirer'

exports.command = 'dependency <dependencies>'
exports.desc = 'Add one or more native dependency(ies) to the Cauldron'

exports.builder = function (yargs: any) {
  return yargs
  .option('containerVersion', {
    alias: 'v',
    type: 'string',
    describe: 'Version to use for generated container. If none provided, patch version will be bumped by default.'
  })
  .option('force', {
    alias: 'f',
    type: 'bool',
    describe: 'Force adding the dependency(ies) (if you really know what you\'re doing)'
  })
  .option('completeNapDescritor', {
    type: 'string',
    alias: 'd',
    describe: 'A complete native application descriptor'
  })
}

exports.handler = async function ({
  dependencies,
  completeNapDescriptor,
  containerVersion,
  force
}: {
  dependencies: Array<string>,
  completeNapDescriptor?: string,
  containerVersion?: string,
  force?: boolean
}) {
  if (containerVersion) {
    ensureValidContainerVersion(containerVersion)
  }

  //
  // If no 'completeNapDescriptor' was provided, list all non released
  // native application versions from the Cauldron, so that user can
  // choose one of them to add the MiniApp(s) to
  if (!completeNapDescriptor) {
    const nativeApps = await cauldron.getAllNativeApps()

    // Transform native apps from the cauldron to an Array
    // of completeNapDescriptor strings
    // [Should probably move to a Cauldron util class for reusability]
    let result =
    _.filter(
      _.flattenDeep(
        _.map(nativeApps, nativeApp =>
          _.map(nativeApp.platforms, p =>
            _.map(p.versions, version => {
              if (!version.isReleased) {
                return `${nativeApp.name}:${p.name}:${version.name}`
              }
            })))), elt => elt !== undefined)

    const { userSelectedCompleteNapDescriptor } = await inquirer.prompt([{
      type: 'list',
      name: 'userSelectedCompleteNapDescriptor',
      message: 'Choose a non released native application version to which you want to add this/these dependency(ies)',
      choices: result
    }])

    completeNapDescriptor = userSelectedCompleteNapDescriptor
  }

  const napDescriptor = NativeApplicationDescriptor.fromString(completeNapDescriptor)

  const dependenciesObjs = _.map(dependencies, d => Dependency.fromString(d))

  try {
    // Begin a Cauldron transaction
    await cauldron.beginTransaction()

    let cauldronContainerVersion
    if (containerVersion) {
      cauldronContainerVersion = containerVersion
    } else {
      cauldronContainerVersion = await cauldron.getContainerVersion(napDescriptor)
      cauldronContainerVersion = semver.inc(cauldronContainerVersion, 'patch')
    }

    for (const dependencyObj of dependenciesObjs) {
      // Add the dependency to Cauldron
      await cauldron.addNativeDependency(napDescriptor, dependencyObj)
    }

    // Run container generator
    await runCauldronContainerGen(
      napDescriptor,
      cauldronContainerVersion,
      { publish: true })

    // Update container version in Cauldron
    await cauldron.updateContainerVersion(napDescriptor, cauldronContainerVersion)

    // Commit Cauldron transaction
    await cauldron.commitTransaction()

    log.info(`Dependency(ies) was/were succesfully added to ${napDescriptor.toString()} !`)
    log.info(`Published new container version ${cauldronContainerVersion} for ${napDescriptor.toString()}`)
  } catch (e) {
    log.error(`An error happened while trying to add a dependency to ${napDescriptor.toString()}`)
    cauldron.discardTransaction()
  }
}

function ensureValidContainerVersion (version: string) {
  if ((/^\d+.\d+.\d+$/.test(version) === false) && (version !== 'auto')) {
    throw new Error(`Invalid version (${version}) for container. Please use a valid version in the form x.y.z`)
  }
}
