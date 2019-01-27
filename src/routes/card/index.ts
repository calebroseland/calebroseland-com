import Card from './Card.vue'

export const route = {
  path: '/card',
  name: 'card',
  component: Card,
  meta: {
    transition: {
      effect: 'fade'
    }
  }
}
