// The old site's Workbox worker lives at this URL in returning visitors' browsers and answers / from its
// cache; their update check fetches this file, which removes that worker and its caches. Keep it forever.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('calebroseland-com') || name.startsWith('workbox-'))
          .map((name) => caches.delete(name)),
      );
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: 'window' });
      await Promise.all(windows.map((client) => client.navigate(client.url)));
    })(),
  );
});
