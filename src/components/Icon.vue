<template>
  <span class="icon">
    <v-icon v-bind="$attrs" v-on="$listeners"/>
  </span>
</template>

<script>
import Icon from 'vue-awesome/components/Icon'

export default {
  name: 'icon',
  components: {
    'v-icon': Icon
  },
  inheritAttrs: false
}
</script>
