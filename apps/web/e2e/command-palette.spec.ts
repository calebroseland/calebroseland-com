import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';

/** Presses the palette shortcut as the page's platform defines it (Mod is ⌘ on macOS, Ctrl elsewhere). */
async function openPalette(page: Page) {
  // The shortcut is registered once the app has rendered.
  await expect(page.getByRole('button', { name: 'Search and commands' })).toBeVisible();
  // TanStack Hotkeys' own rule: macOS if either the platform or the user agent says so.
  const mac = await page.evaluate(() =>
    /mac/i.test(`${navigator.platform} ${navigator.userAgent}`),
  );
  await page.keyboard.press(mac ? 'Meta+k' : 'Control+k');
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
}

test.describe('command palette', () => {
  test('⌘K / Ctrl+K opens it; a search and Enter go to the post', async ({ page }) => {
    await page.goto('/home');
    await openPalette(page);
    const search = page.getByRole('combobox', { name: 'Search commands' });
    await expect(search).toBeFocused();
    await search.fill('second');
    await expect(page.getByRole('option', { name: /Second placeholder/ })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/posts\/second-placeholder$/);
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);
  });

  test('the card reached from a page enters back into that page', async ({ page }) => {
    await page.goto('/about');
    await openPalette(page);
    await page.getByRole('combobox', { name: 'Search commands' }).fill('business card');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole('button', { name: 'Enter' }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible();
  });

  test("the bar's search button opens it, and Escape closes it", async ({ page }) => {
    await page.goto('/posts');
    await page.getByRole('button', { name: 'Search and commands' }).click();
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);
  });

  test('Theme opens a page of themes; choosing one applies it, and Backspace goes back', async ({
    page,
  }) => {
    await page.goto('/home');
    await openPalette(page);
    await page.getByRole('combobox', { name: 'Search commands' }).fill('theme');
    await page.keyboard.press('Enter');
    const themes = page.getByRole('combobox', { name: 'Search Theme' });
    await expect(themes).toBeFocused();
    await page.keyboard.press('Backspace');
    await expect(page.getByRole('combobox', { name: 'Search commands' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Search commands' }).fill('theme');
    await page.keyboard.press('Enter');
    await page.getByRole('option', { name: /Dark/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);
  });

  test('has no serious or critical accessibility violations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/home');
    await openPalette(page);
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .exclude('[data-base-ui-focus-guard]')
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
});
