// @flow

import {
  generateContainerForRunner,
  generateRunner
} from '@walmart/ern-runner-gen'
import {
  android,
  findNativeDependencies,
  Dependency,
  NativeApplicationDescriptor,
  Platform,
  ReactNativeCommands,
  spin,
  tagOneLine,
  yarn
} from '@walmart/ern-util'
import {
  checkCompatibilityWithNativeApp
} from './compatibility.js'
import {
  execSync
} from 'child_process'
import cauldron from './cauldron'
import Manifest from './Manifest'
import fs from 'fs'
import inquirer from 'inquirer'
import _ from 'lodash'
import shell from 'shelljs'
import tmp from 'tmp'
import path from 'path'

const simctl = require('node-simctl')

const {
  runAndroid
} = android
const {
  yarnAdd,
  yarnInstall,
  yarnInfo
} = yarn

export default class MiniApp {
  _path: string
  _packageJson: Object

  constructor (miniAppPath: string) {
    this._path = miniAppPath

    const packageJsonPath = `${miniAppPath}/package.json`
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(tagOneLine`No package.json found.
      This command should be run at the root of a mini-app`)
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    if (!packageJson.ernPlatformVersion) {
      throw new Error(tagOneLine`No ernPlatformVersion found in package.json.
      Are you sure you are running this within an electrode miniapp folder ?`)
    }

    this._packageJson = packageJson
  }

  static fromCurrentPath () {
    return new MiniApp(process.cwd())
  }

  static fromPath (path) {
    return new MiniApp(path)
  }

  // Create a MiniApp object given a valid package path to the MiniApp
  // package path can be any valid git/npm or file path to the MiniApp
  // package
  static async fromPackagePath (packagePath) {
    const tmpMiniAppPath = tmp.dirSync({ unsafeCleanup: true }).name
    shell.cd(tmpMiniAppPath)
    await yarnAdd(packagePath)
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
    const packageName = Object.keys(packageJson.dependencies)[0]
    shell.rm(path.join(tmpMiniAppPath, 'package.json'))
    shell.mv(path.join(tmpMiniAppPath, 'node_modules', packageName, '*'), tmpMiniAppPath)
    return this.fromPath(tmpMiniAppPath)
  }

  static async create (
    appName: string, {
      platformVersion = Platform.currentVersion,
      scope,
      headless
    } : {
      platformVersion: string,
      scope?: string,
      headless?: boolean
    }) {
    try {
      if (Platform.currentVersion !== platformVersion) {
        Platform.switchToVersion(platformVersion)
      }

      log.info(`Creating application ${appName} at platform version ${platformVersion}`)

      const reactNativeDependency = await Manifest.getPlugin('react-native')
      if (!reactNativeDependency) {
        throw new Error('react-native dependency is not defined in manifest. cannot infer version to be used')
      }

      const reactDependency = await Manifest.getJsDependency('react')
      if (!reactDependency) {
        throw new Error('react dependency is not defined in manifest. cannot infer version to be used')
      }

      const reactNativeCommands = new ReactNativeCommands(`${Platform.currentPlatformVersionPath}/node_modules/.bin/react-native`)

      //
      // Create application using react-native init command
      await spin(`Running react-native init using react-native v${reactNativeDependency.version}`,
                reactNativeCommands.init(appName, reactNativeDependency.version))

      //
      // Patch package.json file of application
      const appPackageJsonPath = `${process.cwd()}/${appName}/package.json`
      const appPackageJson = JSON.parse(fs.readFileSync(appPackageJsonPath, 'utf-8'))
      appPackageJson.ernPlatformVersion = `${platformVersion}`
      appPackageJson.ernHeadLess = headless
      appPackageJson.private = false
      appPackageJson.dependencies['react'] = reactDependency.version
      if (scope) {
        appPackageJson.name = `@${scope}/${appName}`
      }
      fs.writeFileSync(appPackageJsonPath, JSON.stringify(appPackageJson, null, 2))

      //
      // Remove react-native generated android and ios projects
      // They will be replaced with our owns when user uses `ern run android`
      // or `ern run ios` command
      const miniAppPath = `${process.cwd()}/${appName}`
      shell.cd(miniAppPath)
      shell.rm('-rf', 'android')
      shell.rm('-rf', 'ios')

      //
      /// If it's a headless miniapp (no ui), just override index.android.js / index.ios.js
      // with our own and create index.source.js
      // Later on it might be done in a better way by retrieving our own structured
      // project rather than using react-native generated on and patching it !
      if (headless) {
        fs.writeFileSync(`${miniAppPath}/index.android.js`, "require('./index.source');", 'utf-8')
        fs.writeFileSync(`${miniAppPath}/index.ios.js`, "require('./index.source');", 'utf-8')
        fs.writeFileSync(`${miniAppPath}/index.source.js`, '// Add your implementation here', 'utf-8')
      }

      return new MiniApp(miniAppPath)
    } catch (e) {
      log.error(`[MiniApp.create] ${e}`)
    }
  }

  get packageJson () : Object {
    return this._packageJson
  }

  get path () : string {
    return this._path
  }

  get name (): string {
    return this.getUnscopedModuleName(this.packageJson.name)
  }

  get version () : string {
    return this.packageJson.version
  }

  get platformVersion () : string {
    return this.packageJson.ernPlatformVersion
  }

  get isHeadLess () : boolean {
    return this.packageJson.ernHeadLess
  }

  // Return all native dependencies currently used by the mini-app
  get nativeDependencies () : Array<Dependency> {
    return findNativeDependencies(`${this.path}/node_modules`)
  }

  async isPublishedToNpm () : Promise<boolean> {
    const publishedVersionsInfo = await yarnInfo(`${this.packageJson.name}@${this.packageJson.version}`, {
      field: 'versions',
      json: true
    })
    if (publishedVersionsInfo.type === 'error') {
      return false
    }
    let publishedVersions: Array<string> = publishedVersionsInfo.data
    return publishedVersions.includes(this.packageJson.version)
  }

    // Return all javascript (non native) dependencies currently used by the mini-app
    // This method checks dependencies from the pa2ckage.json of the miniapp and
    // exclude native dependencies (plugins).
  get jsDependencies () : Array<Dependency> {
    const nativeDependenciesNames = _.map(this.nativeDependencies, d => d.name)
    let result = _.map(this.packageJson.dependencies, (val: string, key: string) =>
            Dependency.fromString(`${key}@${val}`))

    return result == null ? [] : _.filter(result, d => !nativeDependenciesNames.includes(d.name))
  }

  get nativeAndJsDependencies () : Array<Dependency> {
    return [...this.jsDependencies, ...this.nativeDependencies]
  }

  async runInIosRunner () : Promise<*> {
    // Unfortunately, for now, because Container for IOS is not as dynamic as Android one
    // (no code injection for plugins yet :()), it has hard-coded references to
    // our bridge and code-push ... so we absolutely need them in the miniapp for
    // iOS container project to build
    // Ensure that they are present
    // This block should be removed once iOS container is improved to be more flexbile
    const runnerConfig = {
      platformPath: Platform.currentPlatformVersionPath,
      plugins: this.nativeDependencies,
      miniapp: {name: this.name, localPath: this.path},
      outFolder: `${this.path}/ios`,
      headless: this.isHeadLess,
      platform: 'ios',
      containerGenWorkingFolder: `${Platform.rootDirectory}/containergen`,
      pluginsConfigurationDirectory: Platform.pluginsConfigurationDirectory,
      reactNativeAarsPath: `${Platform.manifestDirectory}/react-native_aars`
    }

    const iosDevices = await simctl.getDevices()
    let iosDevicesChoices = _.filter(
                                    _.flattenDeep(
                                       _.map(iosDevices, (val, key) => val)
                                        ), (device) => device.name.match(/^iPhone/))
    const inquirerChoices = _.map(iosDevicesChoices, (val, key) => ({
      name: `${val.name} (UDID ${val.udid})`,
      value: val
    }))

    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'device',
      message: 'Choose iOS simulator',
      choices: inquirerChoices
    }])
    try {
      execSync(`killall "Simulator" `)
    } catch (e) {
      // do nothing if there is no simulator launched
    }

    try {
      execSync(`xcrun instruments -w ${answer.device.udid}`)
    } catch (e) {
      // Apple will always throw some exception because we don't provide a -t.
      // but we just care about launching simulator with chosen UDID
    }

    if (!fs.existsSync('ios')) {
      log.info(`Generating runner iOS project`)
      await generateRunner(runnerConfig)
    } else {
      log.info(`Re-generating runner container`)
      await generateContainerForRunner(runnerConfig)
    }

    const device = answer.device
    shell.cd(`${this.path}/ios`)
    execSync(`xcodebuild -scheme ErnRunner -destination 'platform=iOS Simulator,name=${device.name}' SYMROOT="${this.path}/ios/build" build`)
    await simctl.installApp(device.udid, `${this.path}/ios/build/Debug-iphonesimulator/ErnRunner.app`)
    await simctl.launch(device.udid, 'com.yourcompany.ernrunner')
  }

  async runInAndroidRunner () : Promise<*> {
    const runnerConfig = {
      platformPath: Platform.currentPlatformVersionPath,
      plugins: this.nativeDependencies,
      miniapp: {name: this.name, localPath: this.path},
      outFolder: `${this.path}/android`,
      headless: this.isHeadLess,
      platform: 'android',
      containerGenWorkingFolder: `${Platform.rootDirectory}/containergen`,
      pluginsConfigurationDirectory: Platform.pluginsConfigurationDirectory,
      reactNativeAarsPath: `${Platform.manifestDirectory}/react-native_aars`
    }

    if (!fs.existsSync('android')) {
      log.info(`Generating runner android project`)
      await generateRunner(runnerConfig)
    } else {
      log.info(`Re-generating runner container`)
      await generateContainerForRunner(runnerConfig)
    }

    await runAndroid({
      projectPath: `${this.path}/android`,
      packageName: 'com.walmartlabs.ern'
    })
  }

  async addDependency (
    dependencyName: string,
    {dev} : { dev: boolean } = {}) {
    let dep = await Manifest.getDependency(dependencyName)
    if (!dep) {
      log.warn(
                `
==================================================================================
Dependency ${dependencyName} is not declared in current platform version manifest.
If this is a non purely JS dependency you will face issues during publication.
Otherwise you can safely ignore this warning
==================================================================================
`)
      dep = Dependency.fromString(dependencyName)
    }

    process.chdir(this.path)
    if (dep.scope) {
      await spin(`Installing @${dep.scope}/${dep.name}@${dep.version}`, yarnAdd(dep, {dev}))
    } else {
      await spin(`Installing ${dep.name}@${dep.version}`, yarnAdd(dep, {dev}))
    }
  }

  async upgradeToPlatformVersion (versionToUpgradeTo: string, force: boolean) : Promise<*> {
    if ((this.platformVersion === versionToUpgradeTo) &&
            (!force)) {
      return log.error(`This miniapp is already using v${versionToUpgradeTo}. Use 'f' flag if you want to force upgrade.`)
    }

    // Update all modules versions in package.json
    const manifestDependencies = await Manifest.getTargetNativeAndJsDependencies(versionToUpgradeTo)

    for (const manifestDependency of manifestDependencies) {
      const nameWithScope = `${manifestDependency.scope ? `@${manifestDependency.scope}/` : ''}${manifestDependency.name}`
      if (this.packageJson.dependencies[nameWithScope]) {
        const dependencyManifestVersion = manifestDependency.version
        const localDependencyVersion = this.packageJson.dependencies[nameWithScope]
        if (dependencyManifestVersion !== localDependencyVersion) {
          log.info(`${nameWithScope} : ${localDependencyVersion} => ${dependencyManifestVersion}`)
          this.packageJson.dependencies[nameWithScope] = dependencyManifestVersion
        }
      }
    }

    // Update ernPlatfomVersion in package.json
    this.packageJson.ernPlatformVersion = versionToUpgradeTo

    // Write back package.json
    const appPackageJsonPath = `${this.path}/package.json`
    fs.writeFileSync(appPackageJsonPath, JSON.stringify(this.packageJson, null, 2))

    process.chdir(this.path)
    await spin(`Running yarn install`, yarnInstall())
  }

  async addToNativeAppInCauldron (
    napDescriptor: NativeApplicationDescriptor,
    force: boolean) {
    try {
      const nativeApp = await cauldron.getNativeApp(napDescriptor)

      const miniApp = Dependency.fromString(`${this.packageJson.name}@${this.packageJson.version}`)

      const currentMiniAppEntryInCauldronAtSameVersion = nativeApp.isReleased
                    ? false
                    : await cauldron.getContainerMiniApp(napDescriptor, miniApp)

       // If this is not a forced add, we run quite some checks beforehand
      if (!force) {
        log.info(`Checking if ${miniApp.toString()} is not already in ${napDescriptor.toString()}`)

        if (currentMiniAppEntryInCauldronAtSameVersion) {
          throw new Error(`${miniApp.toString()} already in ${napDescriptor.toString()}`)
        }

        /* log.info(`Checking that container version match native app version`)
        const nativeAppPlatformVersion = nativeApp.ernPlatformVersion
        const miniAppPlatformVersion = this.platformVersion
        if (nativeAppPlatformVersion !== miniAppPlatformVersion) {
        throw new Error(tagOneLine`Platform versions mismatch :
        [${miniAppName} => ${miniAppPlatformVersion}]
        [${appName}:${platformName}:${versionName} => ${nativeAppPlatformVersion}]`);
        } */

        log.info('Checking compatibility with each native dependency')
        let report = await checkCompatibilityWithNativeApp(
          napDescriptor.name,
          napDescriptor.platform,
          napDescriptor.version)
        if (!report.isCompatible) {
          throw new Error('At least a native dependency is incompatible')
        }
      }

      for (const localNativeDependency of this.nativeDependencies) {
        // If local native dependency already exists at same version in cauldron,
        // we then don't need to add it or update it
        const localNativeDependencyString =
                        `${localNativeDependency.scope ? `@${localNativeDependency.scope}/` : ''}${localNativeDependency.name}`
        const remoteDependency =
                    await cauldron.getNativeDependency(napDescriptor, localNativeDependencyString, { convertToObject: true })
        if (remoteDependency && (remoteDependency.version === localNativeDependency.version)) {
          continue
        }

        if (!force) {
          await cauldron.addNativeDependency(napDescriptor, localNativeDependency)
        } else {
          let nativeDepInCauldron
          try {
            nativeDepInCauldron = await cauldron
                            .getNativeDependency(napDescriptor, localNativeDependencyString)
          } catch (e) {
                        // 404 most probably, swallow, need to improve cauldron cli to return null
                        // instead in case of 404
          }

          if (nativeDepInCauldron) {
            await cauldron.updateNativeAppDependency(napDescriptor, localNativeDependencyString, localNativeDependency.version)
          } else {
            await cauldron.addNativeDependency(napDescriptor, localNativeDependency)
          }
        }
      }

      const currentMiniAppEntryInContainer =
                await cauldron.getContainerMiniApp(napDescriptor, miniApp.withoutVersion())

      if (currentMiniAppEntryInContainer && !nativeApp.isReleased) {
        await cauldron.updateMiniAppVersion(napDescriptor, miniApp)
      } else if (!currentMiniAppEntryInContainer && !nativeApp.isReleased) {
        await cauldron.addContainerMiniApp(napDescriptor, miniApp)
      } else {
        console.log('not supported')
      }
    } catch (e) {
      log.error(`[addMiniAppToNativeAppInCauldron ${e.message}`)
      throw e
    }
  }

  publishToNpm () {
    execSync(`npm publish --prefix ${this._path}`)
  }

    // Should go somewhere else. Does not belong in MiniApp class
  getUnscopedModuleName (moduleName: string) : string {
    const npmScopeModuleRe = /(@.*)\/(.*)/
    return npmScopeModuleRe.test(moduleName)
            ? npmScopeModuleRe.exec(`${moduleName}`)[2]
            : moduleName
  }
}
