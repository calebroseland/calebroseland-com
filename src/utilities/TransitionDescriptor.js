import { camelCase, isObject, pick } from 'lodash'

/**
 * If prop is a function, apply the remaining args and return the resolved value.
 * @arg {(Function|String)} prop
 * @returns {string}
 */
function resolve (prop, ...args) {
  return typeof prop === 'function' ? prop.apply(null, args) : prop
}

/**
 * Returns an object from the parsed string, or returns the prop itself (when no splitting is required).
 * @arg {string} prop
 * @returns {(Object|string)}
 */
function parse (prop, ...args) {
  const value = resolve(prop, ...args)
  if (value == null) return value

  const [enter, leave] = value.split('-')
  return enter != null && leave != null ? { enter, leave } : value
}

export default class TransitionDescriptor {
  effect = 'fade'
  flow = 'in-out'
  direction = null
  enter = null
  leave = null

  constructor (props = {}) {
    return Object.assign(this, pick(props, Object.keys(this)))
  }

  toAnimateClass (...args) {
    return TransitionDescriptor.toAnimateClass(this, ...args)
  }

  static from (props) {
    return new TransitionDescriptor(props)
  }

  /**
   * Returns the animate.css class from a transition object
   */
  static toAnimateClass (
    {
      effect,
      flow,
      direction,
      enter,
      leave
    },
    flowType = 'enter',
    to,
    from
  ) {
    if (flowType === 'enter') {
      const resolvedEnterClass = resolve(enter, to, from)
      if (resolvedEnterClass != null) return resolvedEnterClass
    }

    if (flowType === 'leave') {
      const resolvedLeaveClass = resolve(leave, to, from)
      if (resolvedLeaveClass != null) return resolvedLeaveClass
    }

    const props = [effect, flow, direction]
      .map((prop) => {
        const value = parse(prop, to, from)
        return isObject(value) ? value[flowType] : value
      })

    return camelCase(props.join('-'))
  }
}
