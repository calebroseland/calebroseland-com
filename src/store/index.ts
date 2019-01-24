import Vue from 'vue'
import Vuex from 'vuex'
import createPersistedState from 'vuex-persistedstate'

Vue.use(Vuex)

const INIT_LOADING = 'initLoading'
const DARK_MODE = 'darkMode'
const TRANSITIONS_ENABLED = 'transitionsEnabled'

export default new Vuex.Store({
  plugins: [
    createPersistedState({
      paths: [
        'transitionsEnabled',
        'darkMode']
    })
  ],
  state: {
    initLoading: true,
    darkMode: true,
    transitionsEnabled: true
  },
  getters: {

  },
  mutations: {
    [INIT_LOADING] (state, isLoading) {
      state.initLoading = isLoading
    },
    [DARK_MODE] (state, isDark) {
      state.darkMode = isDark
    },
    [TRANSITIONS_ENABLED] (state, value) {
      state.transitionsEnabled = value
    }
  },
  actions: {
    setInitLoading ({ commit, state: { initLoading } }, isLoading) {
      if (initLoading) commit(INIT_LOADING, isLoading)
    },
    toggleDarkMode ({ commit, state: { darkMode } }, isDark = !darkMode) {
      commit(DARK_MODE, isDark)
    },
    toggleTransitionsEnabled ({ commit, state: { transitionsEnabled } }, enabled = !transitionsEnabled) {
      commit(TRANSITIONS_ENABLED, enabled)
    }
  }
})
