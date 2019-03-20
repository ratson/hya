import execa from 'execa'
import fse from 'fs-extra'

import { handler as build, builder as builderBase } from './build'

export const builder = yargs =>
  builderBase(yargs).option('build', {
    default: false,
  })

export const handler = async argv => {
  if (argv.build || !(await fse.pathExists(argv.cordovaDir('www')))) {
    await build(argv)
  }
  await execa('npx', [...argv._, '--no-update-notifier'], {
    cwd: argv.cordovaDir(),
    stdio: 'inherit',
  })
}
