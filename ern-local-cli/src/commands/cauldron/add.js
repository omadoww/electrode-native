exports.command = 'add'
exports.desc = 'Add objects to the Cauldron'
exports.builder = function (yargs) {
  return yargs.commandDir('add').demandCommand(1, 'add needs a command')
}
exports.handler = function (argv) {}
