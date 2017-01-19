// Node
import child_process from 'child_process';
const exec = child_process.exec;
const fs = require('fs');
const http = require('http');
// 3rd party
const shell = require('shelljs');
import cliSpinner from 'cli-spinner';
const Spinner = cliSpinner.Spinner;
const Mustache = require('mustache');
const chalk = require('chalk');
const deepAssign = require('deep-assign');
const readDir = require('fs-readdir-recursive');
const semver = require('semver');
const _ = require('lodash');

let mustacheView = {};
let _verbose = false;
let containerBaseManifest;

const ROOT_DIR = shell.pwd();
const pluginConfigFileName = 'config.json';
const gitFolderRe = /.*\/(.*).git/;
const npmScopeModuleRe = /(@.*)\/(.*)/;
const npmModuleRe = /(.*)@(.*)/;

const DEFAULT_NAMESPACE = 'com.walmartlabs.ern';
const DEFAULT_MAVEN_REPO = `file://${process.env['HOME']}/.m2/repository`;

// Path to ern platform root folder
const ERN_PATH = `${process.env['HOME']}/.ern`;

//=============================================================================
// Async wrappers
//=============================================================================

async function readFile(filename, enc) {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, enc, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

async function writeFile(filename, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filename, data, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

async function shellExec(command) {
  return new Promise((resolve, reject) => {
    shell.exec(command, {async:true}, (code, stdout, stderr) => {
      if (code !== 0) {
        errorLog(stderr);
        reject();
      }
      else resolve();
    });
  });
}

async function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      resolve(res);
    }).on('error', e => {
      reject(e);
    });
  });
}

//=============================================================================
// Mustache related utilities
//=============================================================================

// Mustache render using a template file
// filename: Path to the template file
// view: Mustache view to apply to the template
// returns: Rendered string output
async function mustacheRenderUsingTemplateFile(filename, view) {
  return readFile(filename, 'utf8')
          .then(template => Mustache.render(template, view));
}

// Mustache render to an output file using a template file
// templateFilename: Path to the template file
// view: Mustache view to apply to the template
// outputFile: Path to the output file
async function mustacheRenderToOutputFileUsingTemplateFile(templateFilename, view, outputFile) {
  return mustacheRenderUsingTemplateFile(templateFilename, view).then(output => {
    return writeFile(outputFile, output);
  });
}

//=============================================================================
// container-gen utilities
//=============================================================================

//
// Returns the base path of plugin config
function getPluginConfigPath(plugin, pluginsConfigPath) {
  return `${pluginsConfigPath}/${plugin.name}`;
}

//
// Get the config of a given plugin
// plugin: A plugin object
// pluginsConfigPath : Path to plugins config
// Sample plugin object :
// {
//   name: "react-native-code-push",
//   version: "1.2.3"
// }
async function getPluginConfig(plugin, pluginsConfigPath) {
  let result = {};
  const pluginConfigPath = getPluginConfigPath(plugin, pluginsConfigPath);

  // If there is a base file (common to all versions) use it and optionally
  // patch it with specific version config (if present)
  if (fs.existsSync(`${pluginConfigPath}/${pluginConfigFileName}`)) {
    result = await readFile(`${pluginConfigPath}/${pluginConfigFileName}`)
                   .then(JSON.parse);
  }
  // No config, assume apigen module (temporary)
  // we need to patch the build.gradle file accordingly to update
  // birdge dependency compile statement with platform version
  else {
    log(`No config.json file for ${plugin.name}. Assuming apigen module`);
    result = {
      origin: {
        type: 'npm',
        scope: `${npmScopeModuleRe.exec(`${plugin.name}`)[1]}`,
        name: `${npmScopeModuleRe.exec(`${plugin.name}`)[2]}`
      },
      root: 'android',
      uploadArchives : {
        moduleName: 'lib'
      },
      transform: [
        { file: 'android/lib/build.gradle' }
      ]
    };
  }

  // If there is no specified version, assume plugin version by default
  if (!result.origin.version) {
    // Handle specific rn case
    if (plugin.name === 'react-native') {
      result.origin.version = `v${plugin.version}`;
    } else {
      result.origin.version = plugin.version;
    }
  }

  return result;
}

//
// NPM install a package given its name and optionally its version
// name: The name of the package (should include scope if needed)
// version: The version of the package (optional)
async function npmInstall(name, version) {
  if (version) {
    return shellExec(`npm i ${name}@${version}`);
  } else {
    return shellExec(`npm i ${name}`);
  }
}

// Yarn add a given dependency
async function yarnAdd(name, version) {
  return new Promise((resolve, reject) => {
    exec(version ? `yarn add ${name}@${version}` : `yarn add ${name}`,
      (err, stdout, stderr) => {
      if (err) {
        errorLog(err);
        reject(err);
      }
      if (stderr && _verbose) {
        errorLog(stderr);
      } if (stdout) {
        _verbose && log(stdout);
        resolve(stdout);
      }
    });
  });
}

async function gitClone(url, branch) {
  return new Promise((resolve, reject) => {
    exec(`git clone --branch ${branch} --depth 1 ${url}`,
      (err, stdout, stderr) => {
      // Git seems to send stuff to stderr :(
      if (err) {
        errorLog(err);
        reject(err);
      } else {
        _verbose && log(stdout ? stdout : stderr);
        resolve(stdout ? stdout : stderr);
      }
    });
  });
}

//
// Download the plugin source given a plugin origin
// pluginOrigin: A plugin origin object
// Sample plugin origin objects :
// {
//  "type": "git",
//  "url": "https://github.com/aoriani/ReactNative-StackTracer.git",
//  "version": "0.1.1"
// }
//
// {
//  "type": "npm",
//  "name": "react-native-code-push",
//  "version": "1.16.1-beta"
// }
//
// Note: The plugin will be downloaded locally to the current folder
// For npm origin it will be put in node_modules folder
// For git origin it will be put directly at the root in a folder named after
// the git repo as one would expect
//
// Returns: Absolute path to where the plugin was installed
async function downloadPluginSource(pluginOrigin) {
  let downloadPath;
  if (pluginOrigin.type === 'npm') {
    if (pluginOrigin.scope) {
      await yarnAdd(`${pluginOrigin.scope}/${pluginOrigin.name}`, pluginOrigin.version);
      downloadPath = `node_modules/${pluginOrigin.scope}/${pluginOrigin.name}`;
    } else {
      await yarnAdd(pluginOrigin.name, pluginOrigin.version);
      downloadPath = `node_modules/${pluginOrigin.name}`;
    }
  } else if (pluginOrigin.type === 'git') {
    if (pluginOrigin.version) {
      await gitClone(pluginOrigin.url, pluginOrigin.version);
      downloadPath = gitFolderRe.exec(`${pluginOrigin.url}`)[1];
    }
  }

  return Promise.resolve(`${shell.pwd()}/${downloadPath}`);
}

// Apply transformation of plugin source based on mustache templates
//
// plugin: The plugin
// pluginTemplatesPath: Absolute path to the plugin templates folder
// pluginSourcePath: Absolute path to the plugin source folder
// pluginTransformArr: An array of plugin transform objects
// Sample plugin transform object :
// [
//  {
//    "file": "ReactAndroid/release.gradle",
//    "template": "release.gradle.mustache"
//  }
// ]
async function transformPluginSource(plugin, pluginTemplatesPath, pluginSourcePath, pluginTransformArr) {
  for (const pluginTransform of pluginTransformArr) {
    log(`patching ${pluginSourcePath}/${pluginTransform.file}`);
    let view = Object.assign({}, mustacheView,
      {
        pluginVersion: plugin.versionEx,
        pomGroupId: mustacheView.namespace
      });

    let result;
    // Use ext template
    if (pluginTransform.template) {
      result = await mustacheRenderUsingTemplateFile(
          `${pluginTemplatesPath}/${pluginTransform.template}`, view);
    }
    // In place template
    else {
      result = await mustacheRenderUsingTemplateFile(
          `${pluginSourcePath}/${pluginTransform.file}`, view);
    }

    await writeFile(`${pluginSourcePath}/${pluginTransform.file}`, result);
  }
}

// Build the plugin from source and invoke uploadArchives task to publish plugin
async function buildAndUploadArchive(moduleName) {
  let cmd = `./gradlew ${moduleName}:uploadArchives `;
  return new Promise((resolve, reject) => {
    exec(cmd,
      (err, stdout, stderr) => {
      if (err) {
        errorLog(err);
        reject(err);
      }
      if (stderr) {
        log(stderr);
      } if (stdout) {
        _verbose && log(stdout);
        resolve(stdout);
      }
    });
  });
}

//=============================================================================
// Misc/general utilities
//=============================================================================

// log section message
function sectionLog(msg) {
  _verbose && console.log(chalk.bold.green(`[ern-container-gen] === ${msg.toUpperCase()} ===`));
}

// log info message with ern-container-gen header and chalk coloring
function log(msg) {
  _verbose && console.log(chalk.bold.blue(`[ern-container-gen] ${msg}`));
}

// log error message with ern-container-gen header and chalk coloring
function errorLog(msg) {
  console.log(chalk.bold.red(`[ern-container-gen] ${msg}`));
}

// Given a string returns the same string with its first letter capitalized
function capitalizeFirstLetter(string) {
    return `${string.charAt(0).toUpperCase()}${string.slice(1)}`;
}

// Show a spinner next to a given message for the duration of a promise
// spinner will stop as soon as the promise is completed
//
// msg: The message to display
// prom: The promise to wrap. When promise complete, the spinner will stop
// clean: true if you want the message to disappear once spin stops, false otherwise
export async function spin(msg, prom, clean = false) {
  let spinner = new Spinner(msg);
  spinner.setSpinnerString(18);
  spinner.start();
  try {
    let result = await prom;
    return result;
  }
  finally {
    spinner.stop(false);
    process.stdout.write('\n');
  }
}

//=============================================================================
// ern-container-gen core logic
//=============================================================================

// Build and install all plugins to target maven repository
// plugins: The list of plugins (names and versions)
// paths: Paths object
// rnVersion: React native version
async function installPlugins(plugins, paths, rnVersion) {
  try {
    sectionLog(`Starting plugins installation`);

    for (const plugin of plugins) {
      // Specific handling for react-native as it is a particular plugin
      if (plugin.name === 'react-native') {
        if (await isReactNativeVersionPublished(plugin.version)) {
          log(`Skipping ${plugin.name} [already published]`);
          continue;
        }
      } else {
        if (await isPluginPublished(plugin)) {
            log(`Skipping ${plugin.name}@${plugin.version} [already published]`);
            continue;
          }
      }

      shell.cd(paths.tmpFolder);

      log(`Getting ${plugin.name} plugin config`);
      let pluginConfig = await getPluginConfig(plugin, paths.containerPluginsConfig);

      let pluginSourcePath = await spin(`Downloading ${plugin.name} plugin source`,
        downloadPluginSource(pluginConfig.origin));

      log(`Applying transformations to ${plugin.name} plugin source`);
      await transformPluginSource(
        plugin,
        `${getPluginConfigPath(plugin, paths.containerPluginsConfig)}/templates`,
        pluginSourcePath,
        pluginConfig.transform);

      shell.cd(`${pluginSourcePath}/${pluginConfig.root}`);

      await shellExec('chmod +x gradlew');
      await spin(`Building ${plugin.name} plugin and uploading archive`,
        buildAndUploadArchive(pluginConfig.uploadArchives.moduleName));
    }

    sectionLog(`Completed plugins installation`);
  } catch (e) {
    errorLog("[installPlugins] Something went wrong: " + e);
    throw e;
  }
}

function getUnscopedModuleName(pluginName) {
  return npmScopeModuleRe.test(pluginName) ?
         npmScopeModuleRe.exec(`${pluginName}`)[2]
      :  pluginName;
}

async function buildPluginsViews(plugins, pluginsConfigPath) {
  try {
    let pluginsView = [];

    for (const plugin of plugins) {
      let pluginConfig = await getPluginConfig(plugin, pluginsConfigPath);

      if (pluginConfig.pluginHook) {
        log(`Hooking ${plugin.name} plugin`);
        pluginsView.push({
          "name": pluginConfig.pluginHook.name,
          "lcname": pluginConfig.pluginHook.name.charAt(0).toLowerCase() +
                    pluginConfig.pluginHook.name.slice(1),
          "configurable": pluginConfig.pluginHook.configurable
        });
      }
    }

    // last configurable element must be marked as such ... damn !
    // Not pretty without underscore or lodash
    let pluginsViewLength = pluginsView.length;
    for (let i = pluginsViewLength-1; i >= 0; i--) {
      if (pluginsView[i].configurable === true) {
        pluginsView[i].last = true;
        break;
      }
    }

    mustacheView.plugins = pluginsView;

    mustacheView.pluginCompile = [];
    for (const plugin of plugins) {
      // Remove scope from plugin name if it is present
      let pluginNameUnscoped = getUnscopedModuleName(plugin.name);

      if (plugin.name === "react-native") {
        log(`Will inject: compile 'com.facebook.react:react-native:${plugin.versionEx}'`);
        mustacheView.pluginCompile.push({
          "compileStatement" : `compile 'com.facebook.react:react-native:${plugin.versionEx}'`
        });
      } else {
        log(`Will inject: compile '${mustacheView.namespace}:${pluginNameUnscoped}:${plugin.versionEx}'`);
        mustacheView.pluginCompile.push({
          "compileStatement" : `compile '${mustacheView.namespace}:${pluginNameUnscoped}:${plugin.versionEx}'`
        });
      }
    }
  } catch (e) {
    errorLog("[buildPluginsViews] Something went wrong: " + e);
    throw e;
  }
}

async function addPluginHookClasses(plugins, paths) {
  try {
    sectionLog(`Adding plugin hook classes`);

    for (const plugin of plugins) {
      let pluginConfig = await getPluginConfig(plugin, paths.containerPluginsConfig);
      if (pluginConfig.pluginHook) {
        log(`Adding ${pluginConfig.pluginHook.name}.java`);
        shell.cp(`${paths.containerPluginsConfig}/${plugin.name}/${pluginConfig.pluginHook.name}.java`,
                 `${paths.outFolder}/lib/src/main/java/com/walmartlabs/ern/container/plugins/`);
      }
    }

    sectionLog(`Done adding plugin hook classes`);
  } catch (e) {
    errorLog("[addPluginHookClasses] Something went wrong: " + e);
    throw e;
  }
}

async function fillContainerHull(plugins, miniApps, paths) {
  try {
    sectionLog(`Starting container hull filling`);

    shell.cd(`${ROOT_DIR}`);

    log(`Creating out folder and copying Container Hull to it`);
    shell.cp('-R', `${paths.containerHull}/android`, `${paths.outFolder}`);

    await buildPluginsViews(plugins, paths.containerPluginsConfig);
    await addPluginHookClasses(plugins, paths);

    log(`Patching hull`);
    const files = readDir(`${paths.outFolder}`, (f) => !f.endsWith('.jar'));
    for (const file of files) {
      await mustacheRenderToOutputFileUsingTemplateFile(
        `${paths.outFolder}/${file}`, mustacheView, `${paths.outFolder}/${file}`);
    }

    // Create mini app activities
    log(`Creating miniapp activities`);
    for (const miniApp of miniApps) {
      let miniAppName = getUnscopedModuleName(miniApp.name);
      let pascalCaseMiniAppName = capitalizeFirstLetter(miniAppName);
      let tmpMiniAppView  = {
        miniAppName,
        pascalCaseMiniAppName
      };

      let activityFileName = `${pascalCaseMiniAppName}Activity.java`;

      log(`Creating ${activityFileName}`);
      await mustacheRenderToOutputFileUsingTemplateFile(
        `${paths.containerTemplates}/android/MiniAppActivity.mustache`,
        tmpMiniAppView,
        `${paths.outFolder}/lib/src/main/java/com/walmartlabs/ern/container/miniapps/${activityFileName}`);
    }

    sectionLog(`Completed container hull filling`);
  } catch (e) {
    errorLog("[fillContainerHull] Something went wrong: " + e);
    throw e;
  }
}

async function reactNativeBundle(paths) {
  return new Promise((resolve, reject) => {
    exec(  `react-native bundle \
          --entry-file=index.android.js \
          --dev=false --platform=android \
          --bundle-output=${paths.outFolder}/lib/src/main/assets/index.android.bundle \
          --assets-dest=${paths.outFolder}/lib/src/main/res`,
      (err, stdout, stderr) => {
      if (err) {
        errorLog(err);
        reject(err);
      }
      if (stderr && _verbose) {
        errorLog(stderr);
      } if (stdout) {
        _verbose && log(stdout);
        resolve(stdout);
      }
    });
  });
}

async function bundleMiniApps(miniapps, paths) {
  try {
    sectionLog(`Starting mini apps bundling`);

    // Specific case where we use container gen to generate
    // container for runner and we want to bundle the local miniapp
    if ((miniapps.length === 1) && (miniapps[0].localPath)) {
      shell.cd(miniapps[0].localPath);
    }
    // Generic case
    else {
      shell.mkdir('-p', paths.compositeMiniApp);
      shell.cd(paths.compositeMiniApp);

      let imports = "";
      for (const miniapp of miniapps) {
        const miniAppName = miniapp.scope ? `@${miniapp.scope}/${miniapp.name}`
                                          : miniapp.name;
        imports += `import '${miniAppName}'\n`;
        await spin(`Retrieving and installing ${miniAppName}@${miniapp.version}`,
           yarnAdd(miniAppName, miniapp.version));
      }

      log(`writing index.android.js`);
      await writeFile('./index.android.js', imports);
    }

    await spin(`Bundling all miniapps`, reactNativeBundle(paths));

    sectionLog(`Completed mini apps bundling`);
  } catch(e) {
      errorLog("[bundleMiniApps] Something went wrong: " + e);
  }
}

async function buildAndPublishContainer(paths) {
  try {
    sectionLog(`Starting build and publication of the container`);

    shell.cd(`${paths.outFolder}`)
    await spin(`Building container and uploading archive`,
      buildAndUploadArchive('lib'));

    sectionLog(`Completed build and publication of the container`);
  } catch(e) {
      errorLog("[buildAndPublishContainer] Something went wrong: " + e);
  }
}

function buildPluginListSync(plugins, manifest) {
  let result = [];

  const manifestPlugins = _.map(
    manifest.supportedPlugins, d => ({
      name: npmModuleRe.exec(d)[1],
      version: npmModuleRe.exec(d)[2],
      versionEx: `${npmModuleRe.exec(d)[2]}-${manifest.platformVersion}`
    }));
  const pluginNames = _.map(plugins, p => p.name);
  for (const manifestPlugin of manifestPlugins) {
    if (pluginNames.includes(manifestPlugin.name)) {
      result.push(manifestPlugin);
    }
  }
  return result;
}

function getReactNativeVersionFromManifest(manifest) {
  const rnDep = _.find(manifest.supportedPlugins, d => d.startsWith('react-native@'));
  return npmModuleRe.exec(rnDep)[2];
}

async function isReactNativeVersionPublished(version) {
  return isArtifactInMavenRepo(
    `com.facebook.react:react-native:${version}-${mustacheView.ernPlatformVersion}`,
    mustacheView.mavenRepositoryUrl);
}

async function isPluginPublished(plugin) {
  const unscopedPluginName = getUnscopedModuleName(plugin.name);
  return isArtifactInMavenRepo(
    `${mustacheView.namespace}:${unscopedPluginName}:${plugin.versionEx}`,
    mustacheView.mavenRepositoryUrl);
}

async function isArtifactInMavenRepo(artifactDescriptor, mavenRepoUrl) {
  const explodedArtifactDescriptor = artifactDescriptor.split(':');
  explodedArtifactDescriptor[0] = explodedArtifactDescriptor[0].replace(/[.]/g, '/');
  const partialPathToArtifact = explodedArtifactDescriptor.join('/');
  const mavenRepositoryType = getMavenRepositoryType(mavenRepoUrl);

  // Remote maven repo
  if (mavenRepositoryType === 'http') {
    const res = await httpGet(`${mavenRepoUrl}/${partialPathToArtifact}`);
    return res.statusCode === 200;
  }
  // Otherwise just assume local storage
  else if (mavenRepositoryType === 'file') {
    const mavenPath = mavenRepoUrl.replace('file://', '');
    const exists = fs.existsSync(`${mavenPath}/${partialPathToArtifact}`);
    return fs.existsSync(`${mavenPath}/${partialPathToArtifact}`);
  }
}

function getMavenRepositoryType(mavenRepoUrl) {
  if (mavenRepoUrl.startsWith('http')) {
    return 'http';
  } else if (mavenRepoUrl.startsWith('file')) {
    return 'file';
  }
  return 'invalid';
}

//=============================================================================
// ern-container-gen android generation
//=============================================================================

async function generateAndroidContainer(
  nativeAppName = required('nativeAppName'),
  platformPath = required('platformPath'),
  generator = required('generator'),
  plugins = [],
  miniapps = []) {
  if (generator.name === 'maven') {
    return generateAndroidContainerUsingMavenGenerator(
      nativeAppName, platformPath, plugins, miniapps, generator);
  } else {
    throw new Error(`Android generator ${generator.name} not supported`);
  }
}

async function generateAndroidContainerUsingMavenGenerator(
    nativeAppName = required('nativeAppName'),
    platformPath = required('platformPath'),
    plugins = [],
    miniapps = [], {
      containerPomVersion,
      mavenRepositoryUrl = DEFAULT_MAVEN_REPO,
      namespace = DEFAULT_NAMESPACE
    } = {}) {
  const WORKING_FOLDER = `${ERN_PATH}/containergen`;
  const TMP_FOLDER = `${WORKING_FOLDER}/.tmp`;
  const OUT_FOLDER = `${WORKING_FOLDER}/out`;
  const COMPOSITE_MINIAPP_FOLDER = `${WORKING_FOLDER}/CompositeMiniApp`;

  if ((mavenRepositoryUrl === DEFAULT_MAVEN_REPO)
      && (!fs.existsSync(DEFAULT_MAVEN_REPO))) {
        shell.mkdir('-p', DEFAULT_MAVEN_REPO);
  }

  try {
    log(`\n === Using maven generator
            mavenRepositoryUrl: ${mavenRepositoryUrl}
            containerPomVersion: ${containerPomVersion}
            namespace: ${namespace}`);

    // Clean up to start fresh
    shell.rm('-rf', TMP_FOLDER);
    shell.rm('-rf', OUT_FOLDER);
    shell.rm('-rf', COMPOSITE_MINIAPP_FOLDER);

    shell.mkdir('-p', TMP_FOLDER);

    const paths = {
      containerHull : `${platformPath}/ern-container-gen/hull`,
      containerPluginsConfig: `${platformPath}/ern-container-gen/plugins`,
      containerTemplates: `${platformPath}/ern-container-gen/templates`,
      compositeMiniApp: COMPOSITE_MINIAPP_FOLDER,
      tmpFolder: TMP_FOLDER,
      outFolder: OUT_FOLDER
    };

    const manifest = require(`${platformPath}/manifest.json`);
    const includedPlugins = buildPluginListSync(plugins, manifest);
    const reactNativeVersion = getReactNativeVersionFromManifest(manifest);
    const mavenRepositoryType = getMavenRepositoryType(mavenRepositoryUrl);
    let gradleMavenRepositoryCode;
    if (mavenRepositoryType === 'file') {
      gradleMavenRepositoryCode = `repository(url: "${mavenRepositoryUrl}")`;
    } else if (mavenRepositoryType === 'http') {
      gradleMavenRepositoryCode =
      `repository(url: "${mavenRepositoryUrl}")
       { authentication(userName: mavenUser, password: mavenPassword) }`;
    }


    let exMiniApps = _.map(miniapps, miniapp => ({
      name: miniapp.name,
      unscopedName: getUnscopedModuleName(miniapp.name),
      pascalCaseName: capitalizeFirstLetter(getUnscopedModuleName(miniapp.name)),
      version: miniapp.version
    }));

    mustacheView = {
      "repository" : gradleMavenRepositoryCode,
      mavenRepositoryUrl,
      namespace,
      reactNativeVersion,
      reactNativeVersionEx : `${reactNativeVersion}-${manifest.platformVersion}`,
      ernPlatformVersion: manifest.platformVersion,
      containerPomVersion,
      nativeAppName,
      miniApps: exMiniApps
    }

    // Go through all ern-container-gen steps
    await installPlugins(includedPlugins, paths, reactNativeVersion);
    await fillContainerHull(includedPlugins, miniapps, paths);
    await bundleMiniApps(miniapps, paths);
    await buildAndPublishContainer(paths);
    console.log(`done.`);
    console.log(`Published com.walmartlabs.ern:${nativeAppName}-ern-container:${containerPomVersion}`);
    console.log(`To ${mavenRepositoryUrl}`);
  } catch (e) {
    errorLog(`Something went wrong. Aborting ern-container-gen: ${e}`);
  }
}

//=============================================================================
// ern-container-gen ios generation
//=============================================================================

async function generateIosContainer(
  nativeAppName = required('nativeAppName'),
  platformPath = required('platformPath'),
  generator = required('generator'),
  plugins = [],
  miniapps = []) {
    throw new Error(`No iOS generator yet`);
}

//=============================================================================
// ern-container-gen entry point
//=============================================================================

function required(param) {
    throw new Error(`Missing required ${param} parameter`);
}

// generator: The generator to use along with its config
//  ex :
//  {
//    platform: "android",
//    name: "maven",
//    containerPomVersion: "1.2.3",
//    mavenRepositoryUrl = ...
//  }
// plugins: Array containing all plugins to be included in the container
//  ex :
//  [{ name: "react-native", version: "0.40.0"}, {name: "react-native-code-push"}]
// miniApps: Array of mini apps to be included in the container
//  ex :
//  [
//    {
//      name: "RnDemoApp",
//      version: "1.0.0"
//    }
//  ]
export default async function generateContainer({
    nativeAppName = required('nativeAppName'),
    platformPath = required('platformPath'),
    generator = required('generator'),
    plugins = [],
    miniapps = [],
    verbose = false
  } = {}) {
  try {
    _verbose = verbose;
    if (generator.platform === 'android') {
      await generateAndroidContainer(
        nativeAppName,
        platformPath,
        generator,
        plugins,
        miniapps);
    } else if (generator.platform === 'ios') {
      await generateIosContainer(
        nativeAppName,
        platformPath,
        generator,
        plugins,
        miniapps);
    } else {
      throw new Error(`Platform ${generator.platform} not supported`);
    }
  } catch (e) {
    errorLog(`Something went wrong. Aborting ern-container-gen: ${e}`);
  }
}
