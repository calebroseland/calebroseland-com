import { nth } from 'lodash'

function cycle (array : Array<any>, item : any, offset : number = 1) {
  return nth(array, (array.indexOf(item) + offset) % array.length)
}

export function next (array : Array<any>, item : any) {
  return cycle(array, item)
}

export function prev (array : Array<any>, item : any) {
  return cycle(array, item, -1)
}
