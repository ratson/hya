import yargs from 'yargs'

export function run() {
  const { argv } = yargs
    .commandDir('cmds')
    .demandCommand()
    .recommendCommands()
    .help()
  return argv
}
