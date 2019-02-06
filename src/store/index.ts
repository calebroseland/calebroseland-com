import Vuex, { StoreOptions } from 'vuex'
import createPersistedState from 'vuex-persistedstate'
import { inRange } from 'lodash'

const INIT_LOADING = 'initLoading'
const DARK_MODE_PREFERENCE = 'darkModePreference'
const TRANSITIONS_ENABLED = 'transitionsEnabled'
const NOW = 'now'

const store = new Vuex.Store({
  plugins: [
    createPersistedState({
      paths: [
        TRANSITIONS_ENABLED,
        DARK_MODE_PREFERENCE
      ]
    })
  ],
  state: {
    [INIT_LOADING]: true,
    [DARK_MODE_PREFERENCE]: null,
    [TRANSITIONS_ENABLED]: true,
    [NOW]: new Date()
  },
  getters: {
    darkMode: ({ darkModePreference, now }) =>
      darkModePreference === null ? !inRange(now.getHours(), 7, 19) : darkModePreference
  },
  mutations: {
    [INIT_LOADING] (state, isLoading) {
      state.initLoading = isLoading
    },
    [DARK_MODE_PREFERENCE] (state, isDark) {
      state[DARK_MODE_PREFERENCE] = isDark
    },
    [TRANSITIONS_ENABLED] (state, value) {
      state.transitionsEnabled = value
    },
    [NOW] (state, now: Date) {
      state[NOW] = now
    }
  },
  actions: {
    setInitLoading ({ commit, state: { initLoading } }, isLoading : Boolean) {
      if (initLoading) commit(INIT_LOADING, isLoading)
    },
    toggleDarkMode ({ commit, getters: { darkMode } }, isDark : Boolean | null = !darkMode) {
      commit(DARK_MODE_PREFERENCE, isDark)
    },
    toggleTransitionsEnabled ({ commit, state: { transitionsEnabled } }, enabled : Boolean = !transitionsEnabled) {
      commit(TRANSITIONS_ENABLED, enabled)
    }
  }
})

// update time
setInterval(() => {
  store.commit(NOW, new Date())
}, 1000 * 60)

export default store
