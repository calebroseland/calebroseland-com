<template>
  <transition
    :enter-active-class="enabled ? `animated ${resolvedClasses.enter}` : ''"
    :leave-active-class="enabled ? `animated ${resolvedClasses.leave}` : ''"
    v-bind="$attrs"
    v-on="$listeners">
    <slot/>
  </transition>
</template>

<script>
import { camelCase, isObject, pick } from 'lodash'

/**
 * An object structure that describes a transition for use with Animate.css.
 * An Animate.css class can be broken down to 3 parts: effect, flow, direction.
 * @example `slideInDownBig` would be `{effect: 'slide', flow: 'in', direction: 'downBig'}`.
 *
 * Each part/property can be a single value or split with a hyhen (-).
 * A single value (not split with `-`) will be used for both enter and leave.
 * A dual-value (split with `-`, like `'value-value'`) the first will be used for enter, and the second for leave.
 *
 * @property {string|function} effect the primary name of an animate css class
 * @property {string|function|null} flow the way the transition will flow
 * @property {string|function|null} direction the way in which the transition will move
 * @property {string|function|null} enter the Animate.css classname that is used for enter
 * @property {string|function|null} leave the Animate.css classname that is used for leave
 */
const defaults = {
  effect: null,
  flow: 'in-out',
  direction: null,
  enter: null,
  leave: null
}

// a prop
const resolveProp = (prop, ...args) => typeof prop === 'function' ? prop.apply(null, args) : prop
const format = (...args) => camelCase(args.join('-'))

function parsePropValue (propValue) {
  if (propValue == null) return propValue

  const [enter, leave] = propValue.split('-')
  return enter != null && leave != null ? { enter, leave } : propValue
}

/**
 * Returns the animate.css class from a de object
 * @returns {string} an animate.css class
 */
function propsToAnimateId (
  {
    effect = defaults.effect,
    flow = defaults.flow,
    direction = defaults.direction,
    enter = defaults.enter,
    leave = defaults.leave
  } = {},
  type = 'enter',
  to,
  from
) {
  if (type === 'enter') {
    const resolvedEnterClass = resolveProp(enter, to, from)
    if (resolvedEnterClass != null) return resolvedEnterClass
  }

  if (type === 'leave') {
    const resolvedLeaveClass = resolveProp(leave, to, from)
    if (resolvedLeaveClass != null) return resolvedLeaveClass
  }

  const props = [effect, flow, direction]
    .map(prop => parsePropValue(resolveProp(prop, to, from)))
    .map(value => (isObject(value) ? value[type] : value))

  return format(...props)
}

export default {
  props: {
    effect: [String, Function],
    flow: [String, Function],
    direction: [String, Function],
    enter: [String, Function],
    leave: [String, Function],
    routeMetaKey: {
      type: String,
      default: 'transition'
    },
    handleRouteTransitions: {
      type: Boolean,
      default: false
    },
    router: {
      type: Object,
      default () {
        return this.$router
      }
    },
    enabled: {
      type: Boolean,
      default: true
    }
  },
  data () {
    return {
      enterClass: null,
      leaveClass: null
    }
  },
  computed: {
    resolvedClasses () {
      const defaultProps = pick(this, Object.keys(defaults))
      return {
        enter: this.enterClass || propsToAnimateId(defaultProps, 'enter'),
        leave: this.leaveClass || propsToAnimateId(defaultProps, 'leave')
      }
    }
  },
  methods: {
    resolveProp,
    routeToAnimateId (route, ...args) {
      return propsToAnimateId(route.meta[this.routeMetaKey], ...args)
    },
    setTransitions (enterRoute, leaveRoute = enterRoute, ...args) {
      this.enterClass = this.routeToAnimateId(enterRoute, 'enter', ...args)
      this.leaveClass = this.routeToAnimateId(leaveRoute, 'leave', ...args)
    }
  },
  created () {
    if (this.handleRouteTransitions) {
      // set default transitions for initial load of home route (where there's no route-route transition)
      // when intial route is not the default route (i.e. '/'), `currentRoute` will be empty (`route.name === null`)
      // this is because router still needs to resolve the desired route
      this.setTransitions(this.router.currentRoute)

      // hook into router to resolve props from route meta
      // this also handles initial page load where the desired route needs to be resolved
      this.router.beforeResolve((to, from, next) => {
        this.setTransitions(to, from, to, from)
        next()
      })
    }
  }
}
</script>

<style lang="scss">
@import "~animate.css";

// additional transitions

</style>
