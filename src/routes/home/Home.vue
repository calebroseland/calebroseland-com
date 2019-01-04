<template>
  <div class="route-home">
    <div class="box" :class="{'is-expanded': isBoxExpanded}">
      <span class="name is-brand-font">Caleb Roseland</span>
      <span class="sub">Web App Developer</span>
      <div class="menu columns links" :class="{'is-flex-mobile': !isBoxExpanded}">
        <ul class="menu-list column">
          <li>
            <a
              href="https://github.com/calebroseland"
              target="_blank"
              rel="noopener noreferrer"
            ><span class="icon"><v-icon name="brands/github" scale="2"/></span><span :class="{'is-hidden-mobile': !isBoxExpanded}"> Github</span></a>
            <ul v-if="isBoxExpanded">
              <li>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://github.com/calebroseland/calebroseland-com"
                ><code>this</code>
                </a>
              </li>
              <li>
                <a target="_blank"
                  rel="noopener noreferrer"
                  href="https://github.com/calebroseland/vue-dom-portal"
                >vue-dom-portal</a>
              </li>
              <li>
                <a target="_blank"
                  rel="noopener noreferrer"
                  href="https://gist.github.com/calebroseland"
                >Gists</a>
              </li>
            </ul>
          </li>
        </ul>
        <ul class="menu-list column">
          <li>
            <a
              href="https://medium.com/@calebroseland"
              target="_blank"
              rel="noopener noreferrer"
            ><span class="icon"><v-icon name="brands/medium" scale="2"/></span><span :class="{'is-hidden-mobile': !isBoxExpanded}"> Medium</span></a>
            <ul v-if="isBoxExpanded">
              <li>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://medium.com/@calebroseland/latest"
                >Articles I've written</a>
              </li>
              <li>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://medium.com/@calebroseland/has-recommended"
                >Writings I like</a>
              </li>
              <li>
                <a href="https://medium.com/@calebroseland/highlights">Highlights</a>
              </li>
            </ul>
          </li>
        </ul>
        <ul class="menu-list column">
          <li>
            <a
              class="is-text"
              href="https://linkedin.com/in/calebroseland"
              target="_blank"
              rel="noopener noreferrer"
            ><span class="icon"><v-icon name="brands/linkedin" scale="2"/></span><span :class="{'is-hidden-mobile': !isBoxExpanded}"> LinkedIn</span></a>
          </li>
          <li v-if="isBoxExpanded">
            <a
              class="is-text"
              href="https://npmjs.com/~calebroseland"
              target="_blank"
              rel="noopener noreferrer"
            ><span class="icon"><v-icon name="brands/npm" scale="2"/></span> npm</a>
          </li>
        </ul>
      </div>
      <el-button
        type="text"
        :icon="isBoxExpanded ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"
        @click="isBoxExpanded = !isBoxExpanded"
      ></el-button>

      <!-- corner buttons -->
      <el-tooltip :content="`Transitions: ${transitionsEnabled ? 'ON' : 'OFF'}`" placement="top">
        <a class="top-link left button is-text" :class="{'has-text-light': !transitionsEnabled}" @click="toggleTransitionsEnabled()">
            <span class="icon">
              <v-icon name="exchange-alt" scale="2"/>
            </span>
        </a>
      </el-tooltip>
      <router-link to="/contact" class="top-link right button is-text">
        <span class="icon">
          <v-icon name="address-book" scale="2"/>
        </span>
        <v-icon name="chevron-right" scale="1"/>
      </router-link>
      <!-- end corner buttons -->
    </div>
  </div>
</template>

<script>
// import icons used
import 'vue-awesome/icons/brands/medium'
import 'vue-awesome/icons/brands/github'
import 'vue-awesome/icons/brands/linkedin'
import 'vue-awesome/icons/brands/npm'
import 'vue-awesome/icons/address-book'
import 'vue-awesome/icons/exchange-alt'
import 'vue-awesome/icons/chevron-left'
import 'vue-awesome/icons/chevron-right'
import { mapState, mapActions } from 'vuex'

export default {
  name: 'home',

  data () {
    return {
      isBoxExpanded: false
    }
  },
  computed: mapState([
    'transitionsEnabled'
  ]),
  methods: {
    ...mapActions([
      'toggleTransitionsEnabled'
    ])
  }
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

.top-link
  position: absolute
  top: .5rem
  line-height: 1
  &.left
    left: .5rem

  &.right
    right: .5rem
    padding-right: .25rem

.menu
  a
    font-size: 1.25rem
    line-height: 1

.el-button
  font-size: 2rem

code
  color: $oc-blue-3

</style>
