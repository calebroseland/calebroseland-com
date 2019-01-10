// main dependencies
import '@/configurators/vue'
import '@/configurators/registerServiceWorker'
import '@/configurators/vue-router'
import '@/configurators/vue-meta'
import '@/configurators/element'

// styles
import './styles/index.scss'

// local
import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

// components
import Icon from '@/components/Icon'
import VIcon from 'vue-awesome/components/Icon'

import ExternalLink from '@/components/ExternalLink'
Vue.component('icon', Icon)
Vue.component('v-icon', VIcon)
Vue.component('external-link', ExternalLink)

window.addEventListener('load', () => store.dispatch('setInitLoading', false))

// instantiate root component
new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
