import Vue from 'vue'
import { Button, Loading, Icon, Tooltip } from 'element-ui'
import lang from 'element-ui/lib/locale/lang/en'
import locale from 'element-ui/lib/locale'
import 'element-ui/lib/theme-chalk/base.css'

locale.use(lang)

Vue.use(Button)
Vue.use(Loading)
Vue.use(Icon)
Vue.use(Tooltip)
