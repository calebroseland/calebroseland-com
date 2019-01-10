<template lang="pug">
.route-home
  .box(:class="{'is-expanded': isBoxExpanded}")

    // corner menus/buttons
    .top.left
      el-popover(placement='top' trigger='hover' popper-class='settings-menu')
        button.button.is-text(slot='reference')
          icon(name='cog' scale='2')

        .buttons(style='margin-bottom: 0;')
          el-tooltip(:content="`Page transitions: ${transitionsEnabled ? 'ON' : 'OFF'}`" placement='top')
            button.button.is-text(
                :class="{'has-text-grey-lighter': !transitionsEnabled}"
                @click="toggleTransitionsEnabled()"
              )
              icon(name='exchange-alt' scale='2')

          el-tooltip(:content="`Lights: ${!darkMode ? 'ON' : 'OFF'}`" placement='top')
            button.button.is-text(:class="{'has-text-grey-lighter': darkMode}" @click='toggleDarkMode()')
              icon(name='regular/lightbulb' scale='2')

          //- el-tooltip(content='Theme: ' placement='top')
          //-   button.button.is-text(@click='changeTheme()')
          //-     icon(name='fill-drip' scale='2')

    .top.right
      router-link.button.is-text(to='/contact')
        icon(name='address-card' scale='2')
        icon(name='chevron-right' scale='1' style='width: .75rem;')

    // branding
    span.name.is-brand-font Caleb Roseland
    span.sub Web App Developer

    // menu system
    .menu.columns.links(:class="{'is-flex-mobile has-text-centered-mobile': !isBoxExpanded}")
      // github
      ul.menu-list.column
        li
          p.menu-label(v-if='isBoxExpanded') Projects/Repos
          external-link(to='https://github.com/calebroseland')
            icon(name='brands/github' scale='2')
            span(:class="{'is-hidden-mobile': !isBoxExpanded}")  GitHub

          template(v-if='isBoxExpanded')
            ul
              li
                external-link(to='https://github.com/calebroseland/calebroseland-com')
                  span
                    code this
              li
                a(target='_blank' rel='noopener noreferrer' href='https://github.com/calebroseland/vue-dom-portal')
                  span vue-dom-portal
            ul
              li
                a(target='_blank' rel='noopener noreferrer' href='https://gist.github.com/calebroseland')
                  span Gists

      // medium
      ul.menu-list.column
        li
          p.menu-label(v-if='isBoxExpanded') Writings
          external-link(to='https://medium.com/@calebroseland')
            icon(name='brands/medium' scale='2')
            span(:class="{'is-hidden-mobile': !isBoxExpanded}")  Medium
          template(v-if='isBoxExpanded')
            ul
              li
                external-link(to='https://medium.com/@calebroseland/state-management-in-vue-525ffe12ad81')
                  span State Management in Vue
            ul
              li
                external-link(to='https://medium.com/@calebroseland/has-recommended')
                  span Claps
              li
                a(target='_blank' rel='noopener noreferrer' href='https://medium.com/@calebroseland/highlights')
                  span Highlights

      // social/other links
      ul.menu-list.column
        li
          p.menu-label(v-if='isBoxExpanded') Social
          external-link(to='https://linkedin.com/in/calebroseland')
            icon(name='brands/linkedin' scale='2')
            span(:class="{'is-hidden-mobile': !isBoxExpanded}")  LinkedIn
        li(v-if='isBoxExpanded')
          external-link(to='https://npmjs.com/~calebroseland')
            icon(name='brands/npm' scale='2')
            span  npm
        li(v-if='isBoxExpanded')
          external-link(to='https://stackoverflow.com/users/1352410')
            icon(name='brands/stack-overflow' scale='2')
            span  Stack Overflow

    // expand button
    el-button(type='text' :icon="isBoxExpanded ? 'el-icon-arrow-up' : 'el-icon-arrow-down'" @click='isBoxExpanded = !isBoxExpanded')

</template>

<script>
// import icons used
import 'vue-awesome/icons/brands/medium'
import 'vue-awesome/icons/brands/github'
import 'vue-awesome/icons/brands/linkedin'
import 'vue-awesome/icons/brands/npm'
import 'vue-awesome/icons/address-card'
import 'vue-awesome/icons/exchange-alt'
import 'vue-awesome/icons/chevron-left'
import 'vue-awesome/icons/chevron-right'
import 'vue-awesome/icons/brands/vuejs'
import 'vue-awesome/icons/brands/stack-overflow'
import 'vue-awesome/icons/code'
import 'vue-awesome/icons/cog'
import 'vue-awesome/icons/regular/lightbulb'
import 'vue-awesome/icons/lightbulb'
import 'vue-awesome/icons/fill-drip'

import { Popover } from 'element-ui'

// other deps
import { mapState, mapActions } from 'vuex'

export default {
  name: 'home',
  components: {
    'el-popover': Popover
  },
  data () {
    return {
      isBoxExpanded: false
    }
  },
  computed: mapState([
    'transitionsEnabled',
    'darkMode'
  ]),
  methods: mapActions([
    'toggleTransitionsEnabled',
    'toggleDarkMode'
  ])
}
</script>

<style lang="sass" scoped>
@import '~open-color/open-color.scss'
@import "~bulma/sass/utilities/mixins"

.route-home
  height: 100%
  display: flex
  flex-direction: column
  align-items: center
  justify-content: center

.box
  display: flex
  position: relative
  flex-direction: column
  margin: 3rem 0
  //padding: 1.25rem 0 0 0
  font-size: 1.5rem
  padding-bottom: 0
  max-width: 100vw

span.name
  font-size: 3rem
  display: block
  text-align: center
  margin-top: 1rem
  +mobile
    margin-top: 2rem

span.sub
  text-align: center

.links
  border-bottom: 1px solid white
  padding: 1rem 0 0
  margin: 0
  white-space: nowrap

.top
  position: absolute
  top: .5rem
  line-height: 1
  &.left
    left: .5rem

  &.right
    right: .5rem

.settings-menu
  button
    margin-bottom: 0

.menu
  a
    font-size: 1.25rem
    line-height: 1
  .menu-label
    margin-left: 1rem

.el-button
  font-size: 2rem

</style>
