import { camelCase, pick } from 'lodash'

type Modules = {[index:string] : Object}

function clean (name : string, illegalChars = /(\.\/|\.js)/g) : string {
  return camelCase(name.replace(illegalChars, ''))
}

interface args {
  context : Function | any,
  ignore : string,
  moduleDefaults: Object
}

export default function importFrom (
  {
    context,
    ignore = './index.js',
    moduleDefaults = {}
  } : args,
  ...importKeys : Array<string>
) {
  return context.keys().reduce((modules : Modules, fileName : string) => {
    if (ignore === fileName) return modules

    modules[clean(fileName)] = {
      ...moduleDefaults,
      ...pick(context(fileName), importKeys || ['default'])
    }
    return modules
  }, {})
}
