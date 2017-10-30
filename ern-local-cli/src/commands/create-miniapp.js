// @flow

import {
  MiniApp,
  utils as core
} from 'ern-core'
import {
  Utils
} from 'ern-util'
import utils from '../lib/utils'
import chalk from 'chalk'
import inquirer from 'inquirer'

exports.command = 'create-miniapp <appName> [platformVersion] [scope]'
exports.desc = 'Create a new ern application(miniapp)'

exports.builder = function (yargs: any) {
  return yargs
    .option('platformVersion', {
      alias: 'v',
      type: 'string',
      describe: 'Overrides current platform version in use with this platform version'
    })
    .option('scope', {
      describe: 'specify npm scope to group related packages together'
    })
    .option('skipNpmCheck', {
      describe: 'skips npm check to see if the package already exists. This is mainly useful when running this command for CI',
      type: 'bool'
    })
    .epilog(utils.epilog(exports))
}

exports.handler = async function ({
  appName,
  platformVersion,
  scope,
  skipNpmCheck
} : {
  appName: string,
  platformVersion: string,
  scope?: string,
  skipNpmCheck?: boolean
}) {
  try {
    if (!appName) {
      log.error('MiniApp must contain a value')
      return
    }

    let packageName = appName
    if (packageName !== packageName.toLowerCase()) {
      log.info(`NPM does not allow package names containing upper case letters.`)
      let appNameToken = core.splitCamelCaseString(appName)
      if (appNameToken) {
        packageName = skipNpmCheck ? packageName : await _promptForPackageName(appNameToken.join('-'))
      }
    }

    if (!skipNpmCheck) {
      const isPackageNameInNpm = await utils.doesPackageExistInNpm(packageName)
      // If package name exists in the npm
      if (isPackageNameInNpm) {
        const skipNpmNameConflict = await utils.promptSkipNpmNameConflictCheck(packageName)
        // If user wants to stop execution if npm package name conflicts
        if (!skipNpmNameConflict) {
          return
        }
      }
    }

    await MiniApp.create(appName,
      packageName, {
        platformVersion: platformVersion && platformVersion.replace('v', ''),
        scope
      })
    log.info(`${appName} MiniApp was successfully created !`)
    log.info(`================================================`)
    log.info(chalk.bold.white('To run your MiniApp on Android :'))
    log.info(chalk.white(`    > cd ${appName}`))
    log.info(chalk.white(`followed by :`))
    log.info(chalk.white(`    > ern run-android`))
    log.info(chalk.bold.white('To run your MiniApp on iOS :'))
    log.info(chalk.white(`    > cd ${appName}`))
    log.info(chalk.white(`followed by :`))
    log.info(chalk.white(`    > ern run-ios`))
    log.info(`================================================`)
  } catch (e) {
    Utils.logErrorAndExitProcess(e)
  }
}

async function _promptForPackageName (packageName: string): Promise<string> {
  const {pkgName} = await inquirer.prompt([{
    type: 'input',
    name: 'packageName',
    message: `Type package name to publish to npm. Press Enter to use the default.`,
    default: () => {
      return `${packageName}`
    },
    validate: (value) => {
      if (value && value === value.toLowerCase()) {
        return true
      }
      return 'Check npm package name rules https://docs.npmjs.com/files/package.json'
    }
  }])
  return pkgName
}
