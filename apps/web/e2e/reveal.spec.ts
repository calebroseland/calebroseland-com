import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';

/* Scroll reveal on a body long enough to run past several screens (fixtures/content/pages/images). */

const blocks = (page: Page) => page.locator('.prose > *');

const state = (page: Page) =>
  page.evaluate(() => {
    const all = [...document.querySelectorAll<HTMLElement>('.prose > *')];
    const waiting = all.filter((b) => b.dataset.reveal === 'waiting');
    return {
      total: all.length,
      waiting: waiting.length,
      waitingOnScreen: waiting.filter((b) => {
        const r = b.getBoundingClientRect();
        return r.top < innerHeight && r.bottom > 0;
      }).length,
      waitingAbove: waiting.filter((b) => b.getBoundingClientRect().bottom <= 0).length,
    };
  });

const open = async (page: Page) => {
  await page.goto('/images');
  await expect(page.locator('h1')).toHaveText('Images');
  await expect(blocks(page).first()).toBeVisible();
};

test.describe('scroll reveal', () => {
  test('leaves what is on screen alone and hides only what starts below it', async ({ page }) => {
    await open(page);
    await expect.poll(async () => (await state(page)).waiting).toBeGreaterThan(0);
    const s = await state(page);
    expect(s.waitingOnScreen).toBe(0);
  });

  test('fades blocks in as they scroll into view, and a jump to the end leaves nothing hidden', async ({
    page,
  }) => {
    await open(page);
    await expect.poll(async () => (await state(page)).waiting).toBeGreaterThan(0);
    await page.mouse.wheel(0, 600);
    await expect.poll(async () => (await state(page)).waitingOnScreen).toBe(0);
    await page.keyboard.press('End');
    await expect.poll(async () => (await state(page)).waitingAbove).toBe(0);
    await expect.poll(async () => (await state(page)).waiting).toBe(0);
  });

  test('shows a hidden block as soon as focus lands in it', async ({ page }) => {
    await open(page);
    const last = page.getByRole('link', { name: /last on the page/ });
    await expect
      .poll(() => last.evaluate((a) => a.closest<HTMLElement>('.prose > *')?.dataset.reveal))
      .toBe('waiting');
    await last.focus();
    expect(
      await last.evaluate((a) => a.closest<HTMLElement>('.prose > *')?.dataset.reveal),
    ).toBeUndefined();
  });

  test('hides nothing under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await page.waitForTimeout(300);
    expect((await state(page)).waiting).toBe(0);
  });

  test('prints every block', async ({ page }) => {
    await open(page);
    await expect.poll(async () => (await state(page)).waiting).toBeGreaterThan(0);
    await page.emulateMedia({ media: 'print' });
    const hidden = await page.evaluate(
      () =>
        [...document.querySelectorAll<HTMLElement>('.prose > *')].filter(
          (b) => getComputedStyle(b).opacity !== '1',
        ).length,
    );
    expect(hidden).toBe(0);
  });

  test('a link to a heading lands on visible text, with nothing hidden above it', async ({
    page,
  }) => {
    await page.goto('/images#the-end');
    await expect(page.locator('h1')).toHaveText('Images');
    await expect(page.locator('#the-end')).toBeInViewport();
    await expect.poll(async () => (await state(page)).waitingOnScreen).toBe(0);
    expect((await state(page)).waitingAbove).toBe(0);
  });
});
