import camelCase from 'lodash/camelCase'

const clean = (name, ilegalRegex = /(\.\/|\.js)/g) => camelCase(name.replace(ilegalRegex, ''))

const requireModule = require.context('.', false, /\.js$/)

const moduleDefaults = {
  namespaced: true
}

export default requireModule.keys().reduce((modules, fileName) => {
  if (fileName === './index.js') return modules

  modules[clean(fileName)] = {
    ...moduleDefaults,
    ...requireModule(fileName).default
  }
  return modules
}, {})
