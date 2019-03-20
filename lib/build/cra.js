import path from 'path'

import _ from 'lodash'
import execa from 'execa'
import fse from 'fs-extra'
import Bluebird from 'bluebird'
import Handlebars from 'handlebars'
import pacote from 'pacote'
import replaceInFile from 'replace-in-file'

/**
 * @typedef {Object} CordovaAuthor
 * @property {string} email
 * @property {string} url
 * @property {string} name
 *
 * @typedef {Object} CordovaEngine
 * @property {string} name
 * @property {string} spec
 *
 * @typedef {Object} CordovaPreference
 * @property {string} name
 * @property {string} value
 *
 * @typedef {Object} CordovaPluginVariable
 * @property {string} name
 * @property {string} value
 *
 * @typedef {Object} CordovaPlugin
 * @property {string} name
 * @property {string} spec
 * @property {Array<CordovaPluginVariable>} variables
 *
 * @typedef {Object} CordovaConfigXmlTemplateContext
 * @property {string} id
 * @property {string} version
 * @property {number} versionCode?
 * @property {string} name
 * @property {string} description
 * @property {CordovaAuthor} author
 * @property {Array<CordovaEngine>} engines
 * @property {Array<CordovaPreference>} preferences
 * @property {Array<CordovaPlugin>} plugins
 */
/**
 * @param {CordovaConfigXmlTemplateContext} context
 * @param {string} outputPath
 */
async function outputCordovaConfigXml(context, outputPath) {
  const source = await fse.readFile(`${__dirname}/config.xml.hbs`, 'utf8')
  const template = Handlebars.compile(source)
  const content = template(context)
  await fse.outputFile(outputPath, content, 'utf8')
}

/**
 * @param {import('.').BuildConfig} config
 */
async function normalizePlugins(config) {
  const plugins = [
    await pacote
      .manifest('cordova-plugin-whitelist')
      .then(({ name, version }) => ({
        name,
        spec: version,
      })),
    ...(await Bluebird.map(config.plugins || [], async x => {
      if (_.isString(x)) {
        return {
          name: x,
          spec: _.get(config, ['pkg', 'devDependencies', x]),
        }
      }
      return x
    })),
  ]
  return plugins
}

/**
 * @param {import('.').BuildConfig} config
 */
function normalizePlatforms(config) {
  return ['android', 'ios']
    .map(name => {
      const spec = _.get(config, `pkg.devDependencies.cordova-${name}`)
      return { name, spec }
    })
    .filter(o => o.spec)
}

/**
 * @param {import('.').BuildConfig} config
 */
async function build(config) {
  const { pkg, cordovaDir } = config

  const context = {
    id: 'com.example',
    name: pkg.name,
    version: pkg.version || '0.0.0',
    versionCode: 1,
    description: pkg.description || 'A Cordova Application',
    preferences: [],
    ...config,
    author: {
      name: 'Cordova Team',
      email: 'dev@cordova.apache.org',
      url: 'https://cordova.apache.org',
      ...config.author,
    },
    plugins: await normalizePlugins(config),
    engines: normalizePlatforms(config),
  }
  await outputCordovaConfigXml(context, cordovaDir('config.xml'))

  await fse.outputJSON(cordovaDir('package.json'), {
    private: true,
    cordova: {
      plugins: context.plugins.reduce((acc, { name, variables = {} }) => {
        acc[name] = variables
        return acc
      }, {}),
      platforms: _.map(context.engines, 'name'),
    },
  })

  await execa('npm', ['run', 'build'], {
    cwd: config.cwd,
    stdio: 'inherit',
    env: {
      NODE_ENV: 'production',
      PUBLIC_URL: '.',
    },
  })
  await fse.copy(path.join(config.cwd, 'build'), cordovaDir('www'))

  await execa('npx', ['cordova', 'prepare', '--no-update-notifier'], {
    cwd: cordovaDir(),
    stdio: 'inherit',
  })

  await Promise.all([
    replaceInFile({
      files: [
        cordovaDir('platforms/android/app/src/main/AndroidManifest.xml'),
        cordovaDir('platforms/android/CordovaLib/AndroidManifest.xml'),
      ],
      from: /\s*<uses-sdk [^/]+ \/>/g,
      to: '',
    }),
    replaceInFile({
      files: [
        cordovaDir('platforms/android/build.gradle'),
        cordovaDir('platforms/android/CordovaLib/build.gradle'),
      ],
      from: 'com.android.tools.build:gradle:3.3.0',
      to: 'com.android.tools.build:gradle:3.3.2',
    }),
    replaceInFile({
      files: [
        cordovaDir('platforms/android/app/build.gradle'),
        cordovaDir('platforms/android/CordovaLib/build.gradle'),
      ],
      from: 'buildToolsVersion cdvBuildToolsVersion',
      to: '',
    }),
  ])
}

export default build
