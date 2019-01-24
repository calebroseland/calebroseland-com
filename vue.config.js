module.exports = {
  pwa: {
    name: 'CalebRoseland.com',
    themeColor: '#ADB5BD'
  },

  devServer: {
    allowedHosts: ['.local']
  },
  publicPath: '/',
  outputDir: 'dist',
  assetsDir: '',
  css: {
    sourceMap: true
  },
  transpileDependencies: [
    /\bvue-awesome\b/
  ],
  configureWebpack: {
    resolve: {
      extensions: ['.scss'] // for import of .scss indices
    }
  }
}
