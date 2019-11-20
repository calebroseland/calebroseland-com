export enum DarkModePreference {
  None = 0,
  Enabled,
  Disabled
}

export const DARK_MODE_PREFERENCE = 'darkModePreference'
export const TRANSITIONS_ENABLED = 'transitionsEnabled'
export const DARK_MODE = 'darkMode'

export interface IPreferencesState {
  [DARK_MODE_PREFERENCE]: DarkModePreference,
  [TRANSITIONS_ENABLED]: Boolean
}
