<template>
  <a target="_blank" rel="noopener noreferrer" :href="to">
    <slot></slot>
  </a>
</template>

<script>
export default {
  name: 'external-link',
  props: {
    to: {
      type: String,
      required: true
    }
  }
}
</script>
