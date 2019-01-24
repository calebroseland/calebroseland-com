<template lang="pug">
.route-card
  css-transition(
    effect="simpleFlip"
    direction="xInvert"
    mode="out-in"
    auto-height
    :disabled="!transitionsEnabled"
  )
    .box(:class="{'is-expanded': isBoxExpanded}" v-if="!isFlipped" key=1)
      //- corner menus/buttons
      .top.left
        el-popover(placement='top' trigger='hover' popper-class='settings-menu')
          button.button.is-text(slot='reference' aria-label='settings')
            icon(name='cog' scale=3)

          .buttons(style='margin-bottom: 0;')
            el-tooltip(
              :content="`Transitions: ${transitionsEnabled ? 'ON' : 'OFF'}`"
              placement='top'
            )
              button.button.is-text(
                :class="{'has-text-grey-lighter': !transitionsEnabled}"
                @click="toggleTransitionsEnabled()"
              )
                icon(name='exchange-alt' scale='2')

            el-tooltip(
              :content="`Lights: ${!darkMode ? 'ON' : 'OFF'}`"
              placement='top'
            )
              button.button.is-text(
                :class="{'has-text-grey-lighter': darkMode}"
                @click='toggleDarkMode()'
              )
                icon(name='regular/lightbulb' scale='2')

            //- el-tooltip(content='Theme: ' placement='top')
            //-   button.button.is-text(@click='changeTheme()')
            //-     icon(name='fill-drip' scale='2')

      .top.right
        button.button.is-text(@click="isFlipped = true" aria-label="Contact information")
          icon(name='address-card' scale='2')
          icon(name='chevron-right' scale='1' style='width: .75rem;')

      div.has-text-centered

        //- branding
        span.name.is-brand-font Caleb Roseland
        span.sub Web App Developer

        css-transition(
          effect="fade"
          timing="1s-8s"
          auto-height
          :disabled="!transitionsEnabled || !contentTransitions"
        )
          div.sub-experience(v-if="isBoxExpanded")
            div
              .field.is-grouped.is-grouped-multiline
                .control(v-for="{label, since} in tags")
                  .tags.has-addons
                    span.tag(:class="`${darkMode ? 'is-dark' : 'is-info'}`") {{label}}
                    // span.tag(:class="`${darkMode ? 'is-black' : ''}`") {{since}}

        //- menu system
        .menu.columns.links(:class="{'is-flex-mobile has-text-centered-mobile': !isBoxExpanded}")
          //- github
          ul.menu-list.column
            css-transition(
              effect="fade"
              auto-height
              auto-width
              :disabled="!transitionsEnabled || !contentTransitions"
            )
              li(v-if="isBoxExpanded")
                p.menu-label Projects/Repos
            li
              external-link(to='https://github.com/calebroseland')
                icon(name='brands/github' scale='2')
                span(:class="{'is-hidden-mobile': !isBoxExpanded}")  GitHub

            css-transition(
              effect="fade"
              auto-height
              auto-width
              :disabled="!transitionsEnabled || !contentTransitions"
            )
              li(v-if='isBoxExpanded')
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

          //- medium
          ul.menu-list.column
            css-transition(
              effect="fade"
              auto-height
              auto-width
              :disabled="!transitionsEnabled || !contentTransitions"
            )
              li(v-if="isBoxExpanded")
                p.menu-label Writings
            li
              external-link(to='https://medium.com/@calebroseland')
                icon(name='brands/medium' scale='2')
                span(:class="{'is-hidden-mobile': !isBoxExpanded}")  Medium
            css-transition(
              effect="fade"
              auto-height
              auto-width
              :disabled="!transitionsEnabled || !contentTransitions"
            )
              li(v-if='isBoxExpanded')
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

          //- social/other links
          ul.menu-list.column
            css-transition(
              effect="fade"
              auto-height
              auto-width
              :disabled="!transitionsEnabled || !contentTransitions"
            )
              li(v-if="isBoxExpanded")
                p.menu-label Social
            li
              external-link(to='https://linkedin.com/in/calebroseland')
                icon(name='brands/linkedin' scale='2')
                span(:class="{'is-hidden-mobile': !isBoxExpanded}")  LinkedIn
            css-transition(
              effect="fade"
              auto-height
              auto-width
              :disabled="!transitionsEnabled || !contentTransitions"
            )
              li(v-if='isBoxExpanded')
                external-link(to='https://npmjs.com/~calebroseland')
                  icon(name='brands/npm' scale='2')
                  span  npm
            css-transition(
              effect="fade"
              auto-height
              auto-width
              :disabled="!transitionsEnabled || !contentTransitions"
            )
              li(v-if='isBoxExpanded')
                external-link(to='https://stackoverflow.com/users/1352410')
                  icon(name='brands/stack-overflow' scale='2')
                  span  Stack Overflow

        //- expand button
        button.button.is-text.is-fullwidth(@click='isBoxExpanded = !isBoxExpanded' aria-label='Expand')
          span show {{isBoxExpanded ? 'less' : 'more'}}
          // icon(:name="isBoxExpanded ? 'chevron-circle-up' : 'chevron-circle-down'" scale='2')
    //- reverse side
    .box.flipped(v-else key=2)
        .left.has-text-left
          p.name.is-brand-font Caleb Roseland
          p.sub Web App Developer
          .details
            p
              a(href='tel:+1 507 476 1225')
                i.el-icon-phone
                span  +1 507 476 1225
            p
              a(href='mailto:caleb@calebroseland.com')
                i.el-icon-message
                span  caleb@calebroseland.com
            p
              external-link(to='https://maps.google.com/?q=Minnesota,+USA')
                i.el-icon-location
                span  Minnesota, USA
        .right.has-text-right
          button.button.is-text(@click="toCard()")
            icon(name="times" scale=1.5)

</template>

<script>
import 'vue-awesome/icons/brands/medium'
import 'vue-awesome/icons/brands/github'
import 'vue-awesome/icons/brands/linkedin'
import 'vue-awesome/icons/brands/npm'
import 'vue-awesome/icons/address-card'
import 'vue-awesome/icons/exchange-alt'
import 'vue-awesome/icons/chevron-left'
import 'vue-awesome/icons/chevron-up'
import 'vue-awesome/icons/circle'
import 'vue-awesome/icons/chevron-right'
import 'vue-awesome/icons/chevron-down'
import 'vue-awesome/icons/chevron-circle-up'
import 'vue-awesome/icons/chevron-circle-down'
import 'vue-awesome/icons/brands/vuejs'
import 'vue-awesome/icons/brands/stack-overflow'
import 'vue-awesome/icons/code'
import 'vue-awesome/icons/cog'
import 'vue-awesome/icons/times'
import 'vue-awesome/icons/regular/lightbulb'
import 'vue-awesome/icons/lightbulb'
import 'vue-awesome/icons/fill-drip'
import 'vue-awesome/icons/brands/js'
import 'vue-awesome/icons/map-marker-alt'

import { Popover } from 'element-ui'
import { CssTransition } from '@/components/transitions'
import { mapState, mapActions } from 'vuex'

export default {
  name: 'home',
  components: {
    'el-popover': Popover,
    CssTransition
  },
  data () {
    return {
      isBoxExpanded: false,
      isFlipped: false,
      contentTransitions: true,
      tags: [
        {
          label: 'JavaScript',
          since: '2012'
        },
        {
          label: 'Vue.js',
          since: '2015'
        },
        {
          label: 'ASP.NET',
          since: '2014'
        }
      ]
    }
  },
  computed: mapState([
    'transitionsEnabled',
    'darkMode',
    'initLoaded'
  ]),
  methods: {
    toCard () {
      this.contentTransitions = false
      this.isFlipped = false
      setTimeout(() => {
        this.contentTransitions = true
      }, 1000)
    },
    ...mapActions([
      'toggleTransitionsEnabled',
      'toggleDarkMode'
    ])
  }
}
</script>

<style lang="sass" scoped>
@import '~open-color/open-color.scss'
@import "~bulma/sass/utilities/mixins"

.route-card
  $page-bg: $oc-blue-6
  display: flex
  flex-direction: column
  align-items: center
  justify-content: center

  body &
    background-color: $page-bg

  body[dark-mode] &
    background-color: darken($oc-blue-9, 20%)

.box
  display: flex
  position: relative
  flex-direction: column
  margin: 3rem 0
  //padding: 1.25rem 0 0 0
  font-size: 1.5rem
  max-width: 100vw
  body[has-transitions] &
    animation-duration: .75s
    transition-duration: .75s
    animation-timing-function: ease
  overflow: hidden

span.name
  font-size: 3rem
  line-height: 1.25
  display: block
  text-align: center
  margin-top: 1rem
  +mobile
    margin-top: 2rem

.sub-experience
  > div
    padding: .5rem
  body[has-transitions] &
    overflow: visible
    animation-duration: .3s
  .field
    justify-content: center
  .tag
    body[has-transitions] &
      transition: background-color .3s ease, color .3s ease

span.sub
  text-align: center
  .inline-icons
    margin-left: .5rem
  .icon
    vertical-align: middle

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
  text-align: left

  a
    font-size: 1.25rem
    line-height: 1

  .menu-label
    padding-left: .95rem
    margin-bottom: .5rem

  .menu-list
    ul
      // gotta keep those pixels aligned
      margin-left: .95rem
      padding-left: 13px

.el-button
  font-size: 2rem

.cta-primary
  margin-bottom: 3rem

.box.flipped
  display: flex
  justify-content: space-between
  flex-direction: row
  margin: 3rem 0
  font-size: 1.25rem
  +tablet
    width: 30rem

  .route-contact
    display: flex
    flex-direction: column
    align-items: center
    justify-content: center

  .details
    margin: 2rem 0 0

  .left
    padding: .25rem 0 1rem 1rem

  .close
    padding: .5rem

  .name
    font-size: 2.5rem

</style>

<style>
.el-popover.settings-menu {
  min-width: 100px;
}
</style>
