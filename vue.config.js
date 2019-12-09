module.exports = {
  pwa: {
    name: 'CalebRoseland.com',
    themeColor: '#ADB5BD',
    workboxOptions: {
      runtimeCaching: [
        {
          urlPattern: /service-worker\.js/,
          handler: 'networkFirst',
          options: {
            networkTimeoutSeconds: 10,
            cacheName: 'calebroseland-com-root',
            // Configure which responses are considered cacheable.
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        }
      ]
    }
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
  pluginOptions: {
    webpackBundleAnalyzer: {
      openAnalyzer: false
    }
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
