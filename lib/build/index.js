import _ from 'lodash'
import readPkg from 'read-pkg'

/**
 * @param {import('read-pkg').Package} pkg
 */
const isCra = pkg => _.has(pkg, ['dependencies', 'react-scripts'])

/**
 * @typedef {Object} BuildConfig
 * @property {string} cwd
 * @property {string} icon?
 * @property {string} splash?
 * @property {import('./cra').CordovaAuthor} author
 * @property {Array<import('./cra').CordovaPlugin>} plugins
 * @property {import('read-pkg').Package} pkg?
 * @property {(...args: string[]) => string} cordovaDir
 */
/**
 * @param {BuildConfig} config
 */
async function build(config) {
  // @ts-ignore
  const pkg = await readPkg({ cwd: config.cwd })
  // eslint-disable-next-line no-param-reassign
  config.pkg = pkg
  if (isCra(pkg)) {
    const { default: buildCra } = await import('./cra')
    await buildCra(config)
  } else {
    throw new Error('Project type is not supported')
  }
}

export default build
