// @flow

exports.command = 'del'
exports.desc = 'Remove objects from the Cauldron'
exports.builder = function (yargs: any) {
  return yargs
    .commandDir('del')
    .demandCommand(1, 'add needs a command')
    .strict()
}
exports.handler = function (argv: any) {}
