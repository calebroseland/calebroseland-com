import Home from './Home'

export const route = {
  path: '/',
  name: 'home',
  component: Home,
  meta: {
    transition: {
      effect: 'fade',
      direction: 'downBig',
      enter: (to, from) => (from && from.name === 'contact' ? 'zoomIn' : null),
      leave: (to, from) => (to && to.name === 'contact' ? 'zoomOutRight' : null)
    }
  }
}
