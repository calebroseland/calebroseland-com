import { expect, test } from './fixtures.ts';

/* The old Vue site registered a Workbox worker at /service-worker.js that answers / from its precache,
   so a returning visitor kept seeing the old site. This stands in for it: it caches a page of its own
   and serves / from that cache, as the old precache did, under the old cache prefix. */
const OLD_WORKER = `
const CACHE = 'calebroseland-com-precache-v2-https://calebroseland.com/';
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.put('/', new Response('<!doctype html><title>Old site</title><h1>Old site</h1>', {
        headers: { 'content-type': 'text/html' },
      })),
    ).then(() => self.skipWaiting()),
  );
});
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.mode === 'navigate' && url.pathname === '/') {
    event.respondWith(caches.open(CACHE).then((cache) => cache.match('/')));
  }
});
`;

test.describe('a visitor still holding the old site’s service worker', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'routing a service worker script is Chromium-only in Playwright',
  );

  test('is moved onto the new site, keeping what the new site stored', async ({ page }) => {
    const context = page.context();
    await context.route('**/service-worker.js', (route) =>
      route.fulfill({ contentType: 'text/javascript', body: OLD_WORKER }),
    );
    await page.goto('/');
    await page.evaluate(async () => {
      localStorage.setItem('crc-kept', 'yes');
      await navigator.serviceWorker.register('/service-worker.js');
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Old site' })).toBeVisible();

    // From here the browser's own update checks fetch what the site really serves.
    await context.unroute('**/service-worker.js');
    await page.goto('/');

    await expect
      .poll(() =>
        page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length),
      )
      .toBe(0);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Old site' })).toHaveCount(0);
    await expect(
      page.getByRole('navigation', { name: 'Profiles and links' }).getByRole('link').first(),
    ).toBeVisible();
    expect(await page.evaluate(() => caches.keys())).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem('crc-kept'))).toBe('yes');
  });
});
