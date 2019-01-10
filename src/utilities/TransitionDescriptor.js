import { camelCase, isObject, pick } from 'lodash'

export default class TransitionDescriptor {
  effect = 'fade'
  flow = 'in-out'
  direction = null
  enter = null
  leave = null

  constructor (props = {}) {
    return Object.assign(this, pick(props, Object.keys(this)))
  }

  static from (props) {
    return new TransitionDescriptor(props)
  }

  /**
 * If prop is a function, apply the remaining args and return the resolved value.
 * @arg {(Function|String)} prop
 * @returns {string}
 */
  static resolve (prop, ...args) {
    return typeof prop === 'function' ? prop.apply(null, args) : prop
  }

  /**
 * Returns an object from the parsed string, or returns the prop itself (when no splitting is required).
 * @arg {string} prop
 * @returns {(Object|string)}
 */
  static parse (prop, ...args) {
    const value = this.resolve(prop, ...args)
    if (value == null) return value

    const [enter, leave] = value.split('-')
    return enter != null && leave != null ? { enter, leave } : value
  }

  toAnimateClass (...args) {
    return TransitionDescriptor.toAnimateClass(this, ...args)
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
      const resolvedEnterClass = this.resolve(enter, to, from)
      if (resolvedEnterClass != null) return resolvedEnterClass
    }

    if (flowType === 'leave') {
      const resolvedLeaveClass = this.resolve(leave, to, from)
      if (resolvedLeaveClass != null) return resolvedLeaveClass
    }

    const props = [effect, flow, direction]
      .map((prop) => {
        const value = this.parse(prop, to, from)
        return isObject(value) ? value[flowType] : value
      })

    return camelCase(props.join('-'))
  }
}
