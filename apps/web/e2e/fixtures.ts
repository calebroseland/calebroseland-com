import { test as base, expect } from '@playwright/test';
import { probeTransitionCoverage } from './coverage.ts';

/* Every test fails on an unexpected console error. Opt out per test with `test.use({ allowConsoleErrors: true })`. */
export const test = base.extend<{ allowConsoleErrors: boolean }>({
  allowConsoleErrors: [false, { option: true }],
  page: async ({ page, allowConsoleErrors }, use) => {
    const errors: string[] = [];
    // The app handles its own API and local-store statuses (a 409 is how a conflict is reported), and
    // the browser logs a generic failure for each of those too. The gate is here for the failures
    // nothing handles, like a missing asset or a module that would not load.
    const handled = (url: string | undefined) => Boolean(url && /\/api\/|\/@local\//.test(url));
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      if (handled(msg.location()?.url)) return;
      errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));
    // Failed module or asset loads are the usual cause of "Importing a module script failed"; name the URL.
    page.on('requestfailed', (req) => {
      const reason = req.failure()?.errorText ?? '?';
      // A fetch abandoned by navigation, or a document superseded by the dev server's reload, is a
      // race rather than a fault. A cancelled script or module import still is one.
      const benign =
        /cancel|abort/i.test(reason) && ['fetch', 'xhr', 'document'].includes(req.resourceType());
      if (!benign) errors.push(`request failed: ${req.url()} (${reason})`);
    });
    page.on('response', (res) => {
      if (res.status() >= 400 && !handled(res.url()))
        errors.push(`HTTP ${res.status()}: ${res.url()}`);
    });
    // Every view transition in every test must keep the page covered from start to end.
    await page.addInitScript(probeTransitionCoverage);
    await use(page);
    if (!allowConsoleErrors) expect(errors, 'unexpected console errors').toEqual([]);
    const gaps = await page
      .evaluate(() => (window as unknown as { __vtGaps?: string[] }).__vtGaps ?? [])
      .catch(() => []);
    expect(gaps, 'a view transition let the page behind show through').toEqual([]);
  },
});

export { expect };
