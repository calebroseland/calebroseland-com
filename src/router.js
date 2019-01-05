import Router from 'vue-router'
import { Home, Contact } from './routes'

export default new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    Home,
    Contact
  ]
})
