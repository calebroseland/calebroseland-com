<template>
  <transition
    :enter-active-class="!disabled ? `animated ${resolvedClasses.enterClass}` : ''"
    :leave-active-class="!disabled ? `animated ${resolvedClasses.leaveClass}` : ''"
    v-bind="$attrs"
    v-on="on">
    <slot/>
  </transition>
</template>

<script>

import TransitionDescriptor, { FlowType } from '../TransitionDescriptor'
import { applyStyles } from '@/utilities/dom'

export default {
  props: {
    effect: [String, Function],
    flow: [String, Function],
    direction: [String, Function],
    enterClass: [String, Function],
    leaveClass: [String, Function],
    disabled: Boolean,
    autoWidth: Boolean,
    autoHeight: Boolean
  },
  computed: {
    resolvedClasses () {
      return TransitionDescriptor.from(this).toAnimateClasses()
    },
    on () {
      const { enter, leave, afterEnter } = this
      // if not using either auto dimension, leave listeners alone
      if ((!this.autoWidth && !this.autoHeight) || this.disabled) return this.$listeners
      // else inject them
      return { ...this.$listeners, enter, leave, afterEnter }
    }
  },
  methods: {
    afterEnter (element) {
      applyStyles(element, { width: null, height: null })
    },
    enter (element) {
      {
        const { width, height } = getComputedStyle(element)
        // show invisibly
        applyStyles(element, {
          width: this.autoWidth ? null : width,
          visibility: 'hidden',
          height: this.autoHeight ? null : height
        })
      }
      // capture and store real dimensions
      const { width, height } = getComputedStyle(element)

      // make visible, starting at 0x0
      applyStyles(element, {
        width: this.autoWidth ? 0 : null,
        visibility: null,
        height: this.autoHeight ? 0 : null
      })

      // repaint
      // eslint-disable-next-line no-unused-expressions
      getComputedStyle(element).height

      setTimeout(() => {
        if (this.autoWidth) element.style.width = width
        if (this.autoHeight) element.style.height = height
      })
    },
    leave (element) {
      const { width, height } = getComputedStyle(element)

      if (this.autoWidth) element.style.width = width
      if (this.autoHeight) element.style.height = height

      // repaint
      // eslint-disable-next-line no-unused-expressions
      getComputedStyle(element).height

      setTimeout(() => {
        if (this.autoWidth) element.style.width = 0
        if (this.autoHeight) element.style.height = 0
      })
    }
  },
  inheritAttrs: false
}
</script>

<style lang="scss" scoped>

.animated {
  transition-property: width, height;
  transition: .5s ease;
  overflow: hidden;
}

</style>
