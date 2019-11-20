import { inRange } from 'lodash'
import { Module } from 'vuex'

import { IRootState, NOW } from '@/store/types'
import { next } from '@/utilities/array'

import {
  IPreferencesState,
  DarkModePreference,
  DARK_MODE_PREFERENCE,
  DARK_MODE,
  TRANSITIONS_ENABLED
} from './types'

export default {
  namespaced: true,
  state: {
    [DARK_MODE_PREFERENCE]: DarkModePreference.None,
    [TRANSITIONS_ENABLED]: true
  },
  getters: {
    [DARK_MODE] ({ [DARK_MODE_PREFERENCE]: pref }, getters, { [NOW]: now }) {
      switch (pref) {
        case DarkModePreference.None:
          return !inRange(now.getHours(), 7, 19)

        case DarkModePreference.Enabled:
          return true

        case DarkModePreference.Disabled:
          return false
      }
    }
  },
  mutations: {
    [DARK_MODE_PREFERENCE] (state, shouldBeDark) {
      state[DARK_MODE_PREFERENCE] = shouldBeDark
    },
    [TRANSITIONS_ENABLED] (state, enabled) {
      state[TRANSITIONS_ENABLED] = enabled
    }
  },
  actions: {
    cycleDarkMode (
      { commit, state: { [DARK_MODE_PREFERENCE]: preference } },
      shouldBeDark: DarkModePreference = next([DarkModePreference.Enabled, DarkModePreference.None, DarkModePreference.Disabled], preference)
    ) {
      commit(DARK_MODE_PREFERENCE, shouldBeDark)
    },
    toggleTransitionsEnabled ({ commit, state: { transitionsEnabled } }, enabled: Boolean = !transitionsEnabled) {
      commit(TRANSITIONS_ENABLED, enabled)
    }
  }
} as Module<IPreferencesState, IRootState>
