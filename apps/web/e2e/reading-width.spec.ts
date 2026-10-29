import { expect, test } from './fixtures.ts';

/* Reading width: standard or wide, from the site menu or the palette; kept across reloads and
   shared with the entry editor. Standard is the page as designed. */

type Page = import('@playwright/test').Page;

const columnWidth = async (page: Page) => (await page.getByRole('main').boundingBox())?.width ?? 0;

const choose = async (page: Page, width: 'Standard' | 'Wide') => {
  await page.getByRole('button', { name: /^Theme:/ }).click();
  await page.getByRole('menuitemradio', { name: width }).click();
};

/** Presses the palette shortcut as the page's platform defines it (as command-palette.spec.ts). */
const openPalette = async (page: Page) => {
  await expect(page.getByRole('button', { name: 'Search and commands' })).toBeVisible();
  const mac = await page.evaluate(() =>
    /mac/i.test(`${navigator.platform} ${navigator.userAgent}`),
  );
  await page.keyboard.press(mac ? 'Meta+k' : 'Control+k');
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
};

test.describe('reading width', () => {
  test.skip(({ isMobile }) => isMobile, 'a phone column is the screen at every width');
  test.use({ viewport: { width: 1600, height: 900 } });

  test('wide widens the column and its text; standard is the design', async ({ page }) => {
    await page.goto('/posts/hello-placeholder');
    const standard = await columnWidth(page);

    await choose(page, 'Wide');
    await expect.poll(() => columnWidth(page)).toBeGreaterThan(standard * 1.3);
    await expect
      .poll(async () => (await page.locator('.prose').first().boundingBox())?.width ?? 0)
      .toBeGreaterThan(standard);

    await choose(page, 'Standard');
    await expect.poll(() => columnWidth(page)).toBeCloseTo(standard, 0);
  });

  test('the choice is kept across a reload and shows as checked', async ({ page }) => {
    await page.goto('/about');
    const standard = await columnWidth(page);
    await choose(page, 'Wide');
    await expect.poll(() => columnWidth(page)).toBeGreaterThan(standard);
    const wide = await columnWidth(page);
    await page.reload();
    await expect(page.getByRole('main')).toBeVisible();
    expect(await columnWidth(page)).toBeCloseTo(wide, 0);
    await page.getByRole('button', { name: /^Theme:/ }).click();
    await expect(page.getByRole('menuitemradio', { name: 'Wide' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('the palette sets it too', async ({ page }) => {
    await page.goto('/posts/hello-placeholder');
    const standard = await columnWidth(page);
    await openPalette(page);
    await page.getByRole('combobox', { name: 'Search commands' }).fill('reading width');
    await page.getByRole('option', { name: /Reading width/ }).click();
    await page.getByRole('option', { name: /Wide/ }).click();
    await expect.poll(() => columnWidth(page)).toBeGreaterThan(standard);
  });

  test('the entry editor takes the same width; the posts list does not', async ({ page }) => {
    await page.goto('/posts');
    const list = await columnWidth(page);
    await choose(page, 'Wide');
    await expect(page.getByRole('menu')).toBeHidden();
    expect(await columnWidth(page)).toBeCloseTo(list, 0);

    // Leaving a page mid-load cancels its lazy chunks, which the fixture reports; let each settle.
    await page.waitForLoadState('networkidle');
    await page.goto('/posts/hello-placeholder');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const post = await columnWidth(page);
    await page.waitForLoadState('networkidle');
    await page.goto('/editor/hello-placeholder');
    await expect(page.getByRole('textbox', { name: 'Post body' })).toBeVisible();
    expect(await columnWidth(page)).toBeCloseTo(post, 0);
  });
});
