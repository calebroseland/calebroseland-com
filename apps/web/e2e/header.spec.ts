import { expect, test } from './fixtures.ts';

/* The header stays pinned while scrolling on larger screens; on a phone it scrolls away with the page. */
const sizes = [
  { name: 'a phone on its side', width: 844, height: 390, pinned: false },
  { name: 'a phone upright', width: 390, height: 844, pinned: false },
  { name: 'a tablet upright', width: 820, height: 1180, pinned: true },
  { name: 'a desktop window', width: 1280, height: 720, pinned: true },
];

test.describe('site header', () => {
  for (const { name, width, height, pinned } of sizes)
    test(`${pinned ? 'stays pinned' : 'scrolls away'} on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/posts/hello-placeholder');
      await page.getByRole('heading', { level: 1 }).waitFor();
      await page.evaluate(() => window.scrollTo(0, 600));
      const top = await page.getByRole('banner').evaluate((el) => el.getBoundingClientRect().top);
      expect(top === 0).toBe(pinned);
    });
});
