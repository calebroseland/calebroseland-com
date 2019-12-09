<template>
  <div id="app">
    <route-transition effect="fade" appear mode="out-in" :disabled="!transitionsEnabled">
      <keep-alive>
        <router-view v-if="!isLoading" class="route" />
      </keep-alive>
    </route-transition>
  </div>
</template>

<script>
import { RouteTransition } from './components/transitions'
import { mapState, mapGetters } from 'vuex'
import { DARK_MODE } from '@/store/modules/preferences/types'
export default {
  name: 'app',
  components: { RouteTransition },
  metaInfo() {
    const themeAttrs = {}
    if (this.darkMode) themeAttrs['dark-mode'] = 'dark-mode'
    if (this.transitionsEnabled) themeAttrs['has-transitions'] = 'has-transitions'

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
    ...mapState('preferences', {
      transitionsEnabled: state => state.transitionsEnabled
    }),
    ...mapState(['isLoading']),
    ...mapGetters('preferences', [[DARK_MODE]])
  },
  watch: {
    isLoading(isLoading) {
      if (!isLoading) {
        document.body.removeAttribute('is-loading')
        document.body.removeAttribute('style')
      }
    }
  }
}
</script>

<!-- global styles-->
<style lang="scss">
// @import "~animate.css";

#app {
  width: 100%;
}

.animated {
  animation-duration: 0.75s;
  animation-timing-function: ease;
}

.route {
  min-height: 100%;
}

.route,
.tag {
  body[has-transitions] & {
    transition: background-color 0.3s ease, color 0.3s ease;
  }
}
</style>
