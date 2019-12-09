// main dependencies
import '@/configurators/vue'
import '@/configurators/registerServiceWorker'
import '@/configurators/vue-meta'
import '@/configurators/element'

// styles
import './styles/index.scss'
import 'animate.css'

// local
import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import { IS_LOADING } from './store/types'

// components
import Icon from '@/components/Icon.vue'
import VIcon from 'vue-awesome/components/Icon.vue'
import ExternalLink from '@/components/ExternalLink.vue'
Vue.component(Icon.name, Icon)
Vue.component(VIcon.name, VIcon)
Vue.component(ExternalLink.name, ExternalLink)

window.addEventListener('load', () => store.commit(IS_LOADING, false))

// instantiate root component
new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
