<template>
  <div id="app">
    <animate-css-transition effect="fade" appear mode="out-in" handle-route-transitions :enabled="transitionsEnabled">
      <keep-alive>
        <router-view v-if="!initLoading" class="route"/>
      </keep-alive>
    </animate-css-transition>
  </div>
</template>

<script>
import AnimateCssTransition from './components/transitions/AnimateCssTransition'
import { mapState } from 'vuex'
export default {
  name: 'app',
  components: { AnimateCssTransition },
  metaInfo: {
    htmlAttrs: {
      lang: 'en',
      'dark-mode': 'dark-mode'
    }
  },
  computed: mapState([
    'initLoading',
    'transitionsEnabled'
  ]),
  methods: {}

}
</script>

<style lang="scss">
#app {
  width: 100%;
}

.animated {
  animation-duration: .75s;
  animation-timing-function: ease-in-out;
}

</style>
