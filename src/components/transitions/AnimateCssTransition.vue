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
 * An object structure that describes Animate.css classes for use with Vue's `<transition>` component.
 * An Animate.css class can be broken down to 3 parts: effect, flow, direction.
 * For instance, `slideInDownBig` would be `{effect: 'slide', flow: 'in', direction: 'downBig'}`.
 *
 * Transitions typically flow between two states—enter and leave.
 * These two animations can be described using a single transition object.
 *
 * You can use either `enter` and `leave`, or `effect`, `flow`, and `direction`.
 * `enter` and `leave` will override or take precedence over `effect`, `flow`, and `direction`.
 *
 * `effect`, `flow`, and `direction` can be split using a hyphen (-), with enter on the left and leave on the right.
 * A single value (not split with `-`) will be used for both enter and leave.
 *
 * You can omit `flow`, since "enter" and "leave" nicely translate to "in" and "out".
 *
 * @example `{effect: 'slide', flow: 'in-out', direction: 'downBig-up'}` translates to `{enter: 'slideInDownBig', leave: 'slideOutUp'}`
 * @example `{effect: 'fade', direction: '-down'}` translates to `{enter: 'fadeIn', leave: 'fadeOutDown'}`
 *
 */
const defaultTransition = {
  effect: null,
  flow: 'in-out',
  direction: null,
  enter: null,
  leave: null
}

/**
 * Segmented camelCase formatter.
 * @example `format('fade', 'in', 'upBig') // -> 'fadeInUpBig'`
 * @arg {string[]} strings
 * @returns {string}
 */
function format (...strings) {
  return camelCase(strings.join('-'))
}

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

/**
 * Returns the animate.css class from a transition object
 */
function toAnimateClass (
  {
    effect = defaultTransition.effect,
    flow = defaultTransition.flow,
    direction = defaultTransition.direction,
    enter = defaultTransition.enter,
    leave = defaultTransition.leave
  } = {},
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
    .map(prop => parse(prop, to, from))
    .map(value => (isObject(value) ? value[flowType] : value))

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
      const defaultProps = pick(this, Object.keys(defaultTransition))
      return {
        enter: this.enterClass || toAnimateClass(defaultProps, 'enter'),
        leave: this.leaveClass || toAnimateClass(defaultProps, 'leave')
      }
    }
  },
  methods: {
    routeToAnimateClass (route, ...args) {
      return toAnimateClass(route.meta[this.routeMetaKey], ...args)
    },
    /**
     * Simplifies execution of routeToAnimateClass
     */
    setTransitions (enterRoute, leaveRoute = enterRoute, ...args) {
      this.enterClass = this.routeToAnimateClass(enterRoute, 'enter', ...args)
      this.leaveClass = this.routeToAnimateClass(leaveRoute, 'leave', ...args)
    }
  },
  created () {
    if (this.handleRouteTransitions) {
      // handles intial page load of non-default route
      this.setTransitions(this.router.currentRoute)

      // hook into router to resolve transition props from route meta
      // handles normal route-to-route transitions and initial page load of non-default route
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
