const localOverrides = require('./vue.config.local')

module.exports = {
  pwa: {
    name: 'CalebRoseland.com'
  },

  baseUrl: undefined,
  outputDir: undefined,
  assetsDir: undefined,
  runtimeCompiler: undefined,
  productionSourceMap: undefined,
  parallel: undefined,
  css: {
    sourceMap: true
  },
  ...(localOverrides || {})
}
