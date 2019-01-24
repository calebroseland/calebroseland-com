<template>
  <css-transition
    v-bind="[$attrs, {enterClass, leaveClass}]"
    v-on="$listeners">
    <slot/>
  </css-transition>
</template>

<script>

import TransitionDescriptor, { FlowType } from '../TransitionDescriptor'
import CssTransition from './CssTransition'

export default {
  components: { CssTransition },
  props: {
    routeMetaKey: {
      type: String,
      default: 'transition'
    },
    router: {
      type: Object,
      default () {
        return this.$router
      }
    }
  },
  data () {
    return {
      enterClass: null,
      leaveClass: null
    }
  },
  methods: {
    /**
     * Simplifies execution of routeToAnimateClass
     */
    setTransitions (enterRoute, leaveRoute = enterRoute, ...args) {
      this.enterClass = this.routeToAnimateClass(enterRoute, FlowType.enter, ...args)
      this.leaveClass = this.routeToAnimateClass(leaveRoute, FlowType.leave, ...args)
    },
    /**
     * Get transition descriptor props from a route and convert a {@see Descriptor}
     */
    routeToAnimateClass (route, ...args) {
      return TransitionDescriptor.from(route.meta[this.routeMetaKey]).toAnimateClass(...args)
    },
    initRouteHandler () {
      // handle intial page load of default route
      this.setTransitions(this.router.currentRoute)

      // hook into router to resolve transition props from route meta
      // handle normal route-to-route transitions and initial page load of non-default route
      this.router.beforeResolve((to, from, next) => {
        this.setTransitions(to, from, to, from)
        next()
      })
    }
  },
  created () {
    if (this.router) this.initRouteHandler()
  },
  inheritAttrs: false
}
</script>
