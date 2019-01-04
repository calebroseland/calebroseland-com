// main dependencies
import '@/configurators/vue'
import '@/configurators/registerServiceWorker'
import '@/configurators/vue-router'
import '@/configurators/vue-meta'
import '@/configurators/vue-awesome'
import '@/configurators/element'

// local dependencies
import Vue from 'vue'

// styles
import './styles/index.scss'

// utiliies

// components
import App from './App.vue'
import router from './router'
import store from './store'

window.addEventListener('load', () => store.dispatch('setInitLoading', false))

// instantiate root component
new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
