
export const NOW = 'now'
export const IS_LOADING = 'isLoading'

export interface IRootState {
  [IS_LOADING]: Boolean
  [NOW]: Date
}
