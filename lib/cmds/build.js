import path from 'path'

import del from 'del'

import build from '../build'

export const desc = 'Build Cordova app'

/**
 * @param {import('yargs').Argv} yargs
 */
export const builder = yargs =>
  yargs
    .option({
      clean: {
        default: false,
      },
      cwd: {
        default: process.cwd(),
      },
      config: {
        default: './hya/config.js',
      },
    })
    .middleware(argv => {
      /* eslint-disable no-param-reassign */
      argv.config = path.join(argv.cwd, 'hya/config.js')
      argv.cordovaDir = (...args) =>
        path.join(argv.cwd, '.hya/cordova', ...args)
      /* eslint-enable no-param-reassign */
    })

/**
 * @param {Object} argv
 * @param {boolean} argv.clean
 * @param {string} argv.config
 * @param {() => string} argv.cordovaDir
 */
export const handler = async argv => {
  if (argv.clean) {
    await del('**', { cwd: argv.cordovaDir() })
  }
  const config = await import(argv.config).catch(() => ({}))
  await build({
    ...argv,
    ...config,
  })
}
