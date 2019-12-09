/* eslint-disable no-console */

import { register } from 'register-service-worker'

if (process.env.NODE_ENV === 'production') {
  register(`${process.env.BASE_URL}service-worker.js`, {
    ready () {
      console.log(
        'App is being served from cache by a service worker.\n' +
        'For more details, visit https://goo.gl/AFskqB'
      )

      // #3 & #4 from https://redfin.engineering/how-to-fix-the-refresh-button-when-using-service-workers-a8e27af6df68

      let refreshing
      navigator.serviceWorker.addEventListener('controllerchange',
        function () {
          if (refreshing) return
          refreshing = true
          window.location.reload()
        }
      )

      navigator.serviceWorker.waiting().then(function (reg) {
        if (confirm('Refresh now?')) reg.waiting.skipWaiting()
      })

      addEventListener('fetch', event => {
        event.respondWith((async () => {
          /* eslint-disable no-undef */
          if (event.request.mode === 'navigate' &&
            event.request.method === 'GET' &&
            registration.waiting &&
            (await clients.matchAll()).length < 2
          ) {
            registration.waiting.postMessage('skipWaiting')
            return new Response('', { headers: { Refresh: '0' } })
          }
          return await caches.match(event.request) ||
            fetch(event.request)
        })())
      })
    },
    registered () {
      console.log('Service worker has been registered.')
    },
    cached () {
      console.log('Content has been cached for offline use.')
    },
    updatefound () {
      console.log('New content is downloading.')
    },
    updated () {
      console.log('New content is available; please refresh.')
    },
    offline () {
      console.log('No internet connection found. App is running in offline mode.')
    },
    error (error) {
      console.error('Error during service worker registration:', error)
    }
  })
}
