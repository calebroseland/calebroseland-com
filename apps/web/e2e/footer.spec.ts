import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';

/** Scrolls up from the very bottom by `by` pixels, the same way on touch and pointer devices. */
const shortOfBottom = (page: Page, by: number) =>
  page.evaluate((offset) => {
    const el = document.scrollingElement ?? document.documentElement;
    el.scrollTo({ top: el.scrollHeight - el.clientHeight - offset, behavior: 'instant' });
  }, by);

const atBottom = (page: Page) =>
  page.evaluate(() => {
    const el = document.scrollingElement ?? document.documentElement;
    return el.scrollHeight - el.clientHeight - el.scrollTop <= 1;
  });

test.describe('site footer', () => {
  test('expanding and collapsing keep the page pinned to its bottom edge', async ({ page }) => {
    // The fixture post that exercises every construct is long enough to scroll on every project.
    await page.goto('/posts/hello-placeholder');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Every image in, so the page's height is final before measuring its bottom.
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.images].every((img) => img.complete && img.naturalWidth > 0),
        ),
      )
      .toBe(true);
    // Short of the very bottom: the toggle still pins it.
    await shortOfBottom(page, 80);
    await expect.poll(() => atBottom(page)).toBe(false);
    await page.getByRole('button', { name: 'Expand the footer' }).click();
    await expect(page.getByRole('button', { name: 'Collapse the footer' })).toBeVisible();
    await expect.poll(() => atBottom(page)).toBe(true);

    await shortOfBottom(page, 120);
    await page.getByRole('button', { name: 'Collapse the footer' }).click();
    await expect(page.getByRole('button', { name: 'Expand the footer' })).toBeVisible();
    await expect.poll(() => atBottom(page)).toBe(true);
  });
});
