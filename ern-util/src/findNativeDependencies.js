// @flow

import Dependency from './Dependency'
import readDir from 'fs-readdir-recursive'
import _ from 'lodash'

const NPM_SCOPED_MODULE_RE = /@(.*)\/(.*)/

// This function scans the given path to find any folder containing
// a build.gradle file (which at least is an indication that the folder contains
// some android native code.
// The dependencies are returned as a array of objects
// Each object represent a native dependency (name/version and optionaly scope)
// Sample output :
// [ { name: "react-native", version: "0.39.2", scope: "walmart" }]
export default function findNativeDependencies (path: string) : Array<Dependency> {
  let result = []

  const nativeDependenciesNames = new Set()

  // Get all folders that are containing a build.gradle
  // file (Note: might not be enough if we have react-native plugins
  // that are solely for iOS. Not the case yet)
  const nodeModulesFoldersWithBuildGradle = readDir(path)
          .filter(a => a.includes('build.gradle'))

  // By convention we only assume react native plugins to be in folders
  // which names are starting with 'react-native' (excluding scope)
  const nativeDepsFolders = _.filter(nodeModulesFoldersWithBuildGradle,
          d => d.includes('react-native'))

  for (const nativeDepsFolder of nativeDepsFolders) {
    if (nativeDepsFolder.split('/')[0].startsWith('@')) {
      nativeDependenciesNames.add(
                  `${nativeDepsFolder.split('/')[0]}/${nativeDepsFolder.split('/')[1]}`)
    } else {
      nativeDependenciesNames.add(nativeDepsFolder.split('/')[0])
    }
  }

  // Get associated versions
  for (const nativeDependencyName of nativeDependenciesNames) {
    const nativeDepPackageJson = require(`${path}/${nativeDependencyName}/package.json`)
    if (NPM_SCOPED_MODULE_RE.test(nativeDependencyName)) {
      result.push(new Dependency(NPM_SCOPED_MODULE_RE.exec(nativeDependencyName)[2], {
        scope: NPM_SCOPED_MODULE_RE.exec(nativeDependencyName)[1],
        version: nativeDepPackageJson.version.startsWith('v')
                            ? nativeDepPackageJson.version.slice(1)
                            : nativeDepPackageJson.version
      }))
    } else {
      result.push(new Dependency(nativeDependencyName, {
        version: nativeDepPackageJson.version.startsWith('v')
                            ? nativeDepPackageJson.version.slice(1)
                            : nativeDepPackageJson.version
      }))
    }
  }

  return result
}
