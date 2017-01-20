import { addPluginToMiniApp } from '../../../util/miniapp.js';

exports.command = 'add <name>'
exports.desc = 'Add a plugin to this miniapp'

exports.builder = {}

exports.handler = async function (argv) {
  await addPluginToMiniApp(argv.name);
}
