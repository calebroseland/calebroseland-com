module.exports = {
  pwa: {
    name: 'CalebRoseland.com',
    themeColor: '#ADB5BD'
  },

  devServer: {
    allowedHosts: ['.local']
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
  transpileDependencies: [
    /\bvue-awesome\b/
  ]
}
