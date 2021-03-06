import { camelCase, isObject, pick } from 'lodash'

type Prop = string | Function | null

export enum FlowType { enter = 1, leave = 2 }

interface FlowDescriptor {
  [FlowType.enter]: string,
  [FlowType.leave]: string
}

export interface ITransitionMeta {
  [index: string] : any
  effect: Prop
  flow : Prop
  direction : Prop
  enterClass : Prop
  leaveClass : Prop
}

/**
 * Represents a transition composed of two classes according to the Animate.css naming convention.
 * @example `'slideInDownBig'` would be `{effect: 'slide', flow: 'in', direction: 'downBig'}`
 * @example `{effect: 'slide', direction: 'downBig-up'}` translates to `{enter: 'slideInDownBig', leave: 'slideOutUp'}`
 * @example `{effect: 'fade', direction: '-down'}` translates to `{enter: 'fadeIn', leave: 'fadeOutDown'}`
*/
export default class TransitionDescriptor implements ITransitionMeta {
  effect = null
  flow = 'in-out'
  direction = null
  enterClass = null
  leaveClass = null

  constructor (props : Partial<ITransitionMeta>) {
    // shallow-assign values from props to this that are not null or undefined
    return Object.assign(this, pick(props, Object.keys(this).filter(key => typeof props[key] !== 'undefined')))
  }

  static from (props : Partial<ITransitionMeta>): TransitionDescriptor {
    return new TransitionDescriptor(props)
  }

  toAnimateClass (flowType : FlowType = FlowType.enter, ...args : any) {
    return animateClassFrom(this, flowType, ...args)
  }

  toAnimateClasses (...args : any) {
    return {
      enterClass: this.toAnimateClass(FlowType.enter, ...args),
      leaveClass: this.toAnimateClass(FlowType.leave, ...args)
    }
  }
}

function resolve (prop : Prop, ...args : any) {
  return typeof prop === 'function' ? prop.apply(null, args) : prop
}

function parse (prop : Prop, ...args : any) : string | FlowDescriptor | null {
  const value = resolve(prop, ...args)
  if (value == null) return value

  const [enter, leave] = value.split('-')

  if (enter == null || leave == null) return value

  return { [FlowType.enter]: enter, [FlowType.leave]: leave }
}

function animateClassFrom (
  {
    effect,
    flow,
    direction,
    enterClass,
    leaveClass
  } : ITransitionMeta,
  flowType : FlowType = FlowType.enter,
  ...args : Array<Function>
) {
  if (flowType === FlowType.enter) {
    const resolvedEnterClass = resolve(enterClass, ...args)
    if (resolvedEnterClass != null) return resolvedEnterClass
  }

  if (flowType === FlowType.leave) {
    const resolvedLeaveClass = resolve(leaveClass, ...args)
    if (resolvedLeaveClass != null) return resolvedLeaveClass
  }

  const props = [effect, flow, direction]
    .map((prop) => {
      const value = parse(prop, ...args)
      return isObject(value) ? value[flowType] : value
    })

  return camelCase(props.join('-'))
}
