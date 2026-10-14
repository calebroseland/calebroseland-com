import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';

/* The loading bar: past 300 ms of waiting it shows, then finishes; a quick load never shows it. */

const bar = (page: Page) => page.locator('[data-phase]').first();

// Records every phase the bar passes through, from before the app starts.
const recordPhases = (page: Page) =>
  page.addInitScript(() => {
    const w = window as unknown as { __phases: string[] };
    w.__phases = [];
    new MutationObserver((records) => {
      for (const r of records) {
        const el = r.target as Element;
        if (r.attributeName === 'data-phase') {
          w.__phases.push(el.getAttribute('data-phase') ?? '');
        }
      }
    }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-phase'] });
  });

// The same, from now on, on a page already open.
const recordPhasesNow = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __phases: string[] };
    w.__phases = [];
    const el = document.querySelector('[data-phase]');
    if (el) {
      new MutationObserver(() => w.__phases.push(el.getAttribute('data-phase') ?? '')).observe(el, {
        attributes: true,
        attributeFilter: ['data-phase'],
      });
    }
  });

const phases = (page: Page) =>
  page.evaluate(() => (window as unknown as { __phases: string[] }).__phases);

test.describe('loading bar', () => {
  test('shows for a slow navigation, marks the page busy, then clears', async ({ page }) => {
    await recordPhases(page);
    await page.goto('/posts');
    await expect(page.getByRole('heading', { level: 1, name: 'Posts' })).toBeVisible();
    await page.route(/virtual:content\/entry/, async (route) => {
      await new Promise((r) => setTimeout(r, 900));
      await route.continue();
    });
    await page
      .getByRole('heading', { level: 2 })
      .getByRole('link', { name: 'Second placeholder' })
      .click();
    await expect(bar(page)).toHaveAttribute('data-phase', 'running');
    await expect(page.locator('html')).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Second placeholder');
    await expect(bar(page)).toHaveAttribute('data-phase', 'hidden');
    await expect(page.locator('html')).not.toHaveAttribute('aria-busy', 'true');
    expect(await phases(page)).toContain('finishing');
  });

  test('never shows for a navigation that loads nothing', async ({ page }) => {
    await page.goto('/posts');
    await expect(page.getByRole('heading', { level: 1, name: 'Posts' })).toBeVisible();
    await recordPhasesNow(page);
    // A tag filter is a search change on a page already here: no chunk, no loader wait.
    await page.getByRole('list', { name: 'Tags' }).getByRole('link', { name: 'meta' }).click();
    await expect(page).toHaveURL(/\?tag=meta$/);
    await page.waitForTimeout(600);
    expect(await phases(page)).not.toContain('running');
  });

  test('a reader never fetches editor code, even after the page idles', async ({ page }) => {
    const editorCode: string[] = [];
    page.on('request', (r) => {
      // The dev server serves editor routes whole with the route tree (it splits them only in a
      // build), so the chunks that load on their own here are the card and theme editors.
      if (/cardEditor\/|ThemeEditor/.test(r.url())) {
        editorCode.push(r.url());
      }
    });
    await page.goto('/');
    await page.waitForTimeout(3500);
    await page.goto('/posts/hello-placeholder');
    await page.waitForTimeout(3500);
    expect(editorCode).toEqual([]);
  });

  test('leaves nothing animating once it hides, under reduced motion too', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/posts');
    await expect(page.getByRole('heading', { level: 1, name: 'Posts' })).toBeVisible();
    await page.route(/virtual:content\/entry/, async (route) => {
      await new Promise((r) => setTimeout(r, 900));
      await route.continue();
    });
    for (const name of ['Second placeholder', 'Hello, placeholder']) {
      await page.goto('/posts');
      await page.getByRole('heading', { level: 2 }).getByRole('link', { name }).click();
      await expect(bar(page)).toHaveAttribute('data-phase', 'running');
      await expect(bar(page)).toHaveAttribute('data-phase', 'hidden');
    }
    const left = await bar(page).evaluate(
      (el) => el.getAnimations().filter((a) => a.playState === 'running').length,
    );
    expect(left).toBe(0);
  });
});
