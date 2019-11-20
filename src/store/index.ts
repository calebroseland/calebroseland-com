import Vuex from 'vuex'
import createPersistedState from 'vuex-persistedstate'

import preferences from './modules/preferences'
import { TRANSITIONS_ENABLED, DARK_MODE_PREFERENCE } from './modules/preferences/types'

import {IRootState, NOW, IS_LOADING} from './types'

const store = new Vuex.Store<IRootState>({
  plugins: [
    createPersistedState({
      paths: [
        `preferences/${TRANSITIONS_ENABLED}`,
        `preferences/${DARK_MODE_PREFERENCE}`
      ]
    })
  ],
  state: {
    [IS_LOADING]: true,
    [NOW]: new Date()
  },
  mutations: {
    [NOW] (state, time: Date) {
      state[NOW] = time
    },
    [IS_LOADING] (state, isLoading: Boolean) {
      state[IS_LOADING] = isLoading
    }
  },
  modules: {
    preferences
  }
})

// update time
setInterval(() => {
  store.commit(NOW, new Date())
}, 1000 * 60)

export default store
