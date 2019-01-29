<template>
  <div id="app">
    <route-transition effect="fade" appear mode="out-in" :disabled="!transitionsEnabled">
      <keep-alive>
        <router-view v-if="!initLoading" class="route"/>
      </keep-alive>
    </route-transition>
  </div>
</template>

<script>
import { RouteTransition } from './components/transitions'
import { mapState, mapGetters } from 'vuex'
export default {
  name: 'app',
  components: { RouteTransition },
  metaInfo () {
    const themeAttrs = {}
    if (this.darkMode) themeAttrs['dark-mode'] = null
    if (this.transitionsEnabled) themeAttrs['has-transitions'] = null

    return {
      htmlAttrs: {
        lang: 'en'
      },
      bodyAttrs: {
        ...themeAttrs
      }
    }
  },
  computed: {
    ...mapState([
      'initLoading',
      'transitionsEnabled'
    ]),
    ...mapGetters([
      'darkMode'
    ])
  },
  watch: {
    'initLoading' (isLoading) {
      if (!isLoading) {
        document.body.removeAttribute('is-loading')
        document.body.removeAttribute('style')
      }
    }
  }
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

.route {
  min-height: 100%;
}

.route,
.tag {
  body[has-transitions] & {
    transition: background-color .3s ease, color .3s ease;
  }
}

</style>
