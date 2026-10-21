import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures.ts';

/* The editor without writing to disk: edit mode, getting in and out, and unsaved work kept on this
   device. Anything that saves runs in editor-local.spec.ts, one test at a time. */

type Page = import('@playwright/test').Page;

/** Opening the editor turns edit mode on. */
const openBoard = async (page: Page) => {
  await page.goto('/editor');
  await expect(page.getByRole('heading', { level: 1, name: 'Editor' })).toBeVisible();
};

/** Starts the tab in edit mode, as if it had been turned on before. */
const startInEditMode = (page: Page) =>
  page.addInitScript(() => sessionStorage.setItem('crc:edit-mode', 'on'));

const openMenu = async (page: Page) => {
  await page.getByRole('button', { name: /^Theme:/ }).click();
  return page.getByRole('menu');
};

const expectNoSeriousViolations = async (page: Page, state: string) => {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(serious, `${state}: ${JSON.stringify(serious, null, 2)}`).toEqual([]);
};

const body = (page: Page) => page.getByRole('textbox', { name: 'Post body' });

test.describe('edit mode', () => {
  test('is off at first: the site offers no editing until it is turned on', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit card' })).toHaveCount(0);
    // Let the page's lazy modules land: WebKit reports a navigation that cancels them as a failure.
    await page.waitForLoadState('networkidle');
    await page.goto('/about');
    await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Edit About' })).toHaveCount(0);

    const menu = await openMenu(page);
    await expect(menu.getByRole('menuitemcheckbox', { name: 'Edit mode' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await expect(menu.getByRole('menuitem', { name: 'Editor' })).toHaveCount(0);
  });

  test('turned on from a page, offers Edit there; Close in its editor comes back to it', async ({
    page,
  }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible();
    const menu = await openMenu(page);
    await menu.getByRole('menuitemcheckbox', { name: 'Edit mode' }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('link', { name: 'Edit About' }).click();
    await expect(page).toHaveURL(/\/editor\/about\?from=/);
    await expect(body(page)).toBeVisible();
    // Switching panels keeps where the edit came from.
    await page.getByRole('tab', { name: /Images/ }).click();
    await page.getByRole('link', { name: 'Close' }).click();
    await expect(page).toHaveURL(/\/about$/);
  });

  test("the menu opens the editor, whose Pages filter lists the site's pages", async ({ page }) => {
    await startInEditMode(page);
    await page.goto('/home');
    await (await openMenu(page)).getByRole('menuitem', { name: 'Editor' }).click();
    await expect(page).toHaveURL(/\/editor\/?$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Editor' })).toBeVisible();

    const filters = page.getByRole('navigation', { name: 'Show' });
    await filters.getByRole('link', { name: /^Pages/ }).click();
    await expect(page).toHaveURL(/\/editor\/?\?kind=page$/);
    await expect(filters.getByRole('link', { name: /^Pages/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    const board = page.getByRole('main');
    await expect(board.getByRole('link', { name: 'About', exact: true })).toBeVisible();
    await expect(board.getByRole('link', { name: /placeholder/i })).toHaveCount(0);
    await page.getByRole('link', { name: 'New page' }).click();
    await expect(page).toHaveURL(/\/editor\/new\?kind=page/);
    await expect(page.getByRole('radio', { name: /^page/i })).toBeChecked();
  });
});

test.describe('unsaved work', () => {
  test('survives a reload and can be discarded', async ({ page }) => {
    await page.goto('/editor/hello-placeholder');
    await body(page).click();
    await page.keyboard.type('Not yet saved');
    await expect(page.getByText('Unsaved changes')).toBeVisible();
    await page.waitForFunction(() =>
      Object.keys(localStorage).some((k) => k.startsWith('crc:buffer:')),
    );
    await page.reload();
    await expect(page.getByRole('status').filter({ hasText: 'Restored' })).toContainText(
      'Restored unsaved changes from this device.',
    );
    await expect(body(page)).toContainText('Not yet saved');
    await page.getByRole('button', { name: 'Discard local changes' }).click();
    await expect(body(page)).not.toContainText('Not yet saved');
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  });

  test('Close goes back to the list and keeps the edit for next time', async ({ page }) => {
    await openBoard(page);
    await page.getByRole('link', { name: 'Hello, placeholder' }).click();
    await body(page).click();
    await page.keyboard.type('Half a thought');
    // Straight away, inside the autosave debounce: closing writes the edit down itself.
    await page.getByRole('link', { name: 'Close' }).click();
    await expect(page).toHaveURL(/\/editor\/?$/);
    await expect(page.getByRole('status').filter({ hasText: 'kept on this device' })).toBeVisible();
    await page.getByRole('link', { name: 'Hello, placeholder' }).click();
    await expect(body(page)).toContainText('Half a thought');
  });

  test('stays with its own entry: another entry opens with its own text', async ({ page }) => {
    await page.goto('/editor/hello-placeholder');
    await body(page).click();
    await page.keyboard.type('Only in hello');
    await expect(page.getByText('Unsaved changes')).toBeVisible();

    await page.goto('/editor/second-placeholder');
    await expect(page.getByRole('heading', { level: 1, name: 'Second placeholder' })).toBeVisible();
    await expect(body(page)).not.toContainText('Only in hello');
    await expect(page.getByRole('status').filter({ hasText: 'Restored' })).toHaveCount(0);

    await page.goto('/editor/hello-placeholder');
    await expect(body(page)).toContainText('Only in hello');

    // In the app, the same way: back to the list, then the other entry.
    await page.getByRole('link', { name: '← Editor' }).click();
    await page.getByRole('link', { name: 'Second placeholder' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Second placeholder' })).toBeVisible();
    await expect(body(page)).not.toContainText('Only in hello');
  });
});

test.describe('editor', () => {
  test('an unknown slug says so instead of failing to load', async ({ page }) => {
    await page.goto('/editor/no-such-entry');
    await expect(page.getByRole('alert').filter({ hasText: 'No entry' })).toContainText(
      'No entry with the slug',
    );
  });

  test("the formatting toolbar sticks below the site's pinned bar, not under it", async ({
    page,
  }) => {
    await page.goto('/editor/about');
    await body(page).click();
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Enter');
    }
    await page.mouse.wheel(0, 1500);
    const bar = await page.getByRole('banner').boundingBox();
    test.skip(!bar || bar.y + bar.height <= 0, 'the bar scrolls away on this screen');
    await expect
      .poll(async () => (await page.getByRole('button', { name: 'Bold' }).boundingBox())?.y ?? 0)
      .toBeGreaterThanOrEqual((bar?.y ?? 0) + (bar?.height ?? 0));
  });

  test('the side panel tabs follow the APG pattern: arrow keys move and select', async ({
    page,
  }) => {
    await page.goto('/editor/about');
    const details = page.getByRole('tab', { name: 'Details' });
    await details.focus();
    await page.keyboard.press('ArrowRight');
    const images = page.getByRole('tab', { name: /^Images/ });
    await expect(images).toBeFocused();
    await expect(images).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toHaveAccessibleName(/^Images/);
    await page.keyboard.press('ArrowLeft');
    await expect(details).toHaveAttribute('aria-selected', 'true');
  });

  test('switching the side panel keeps the page where it was', async ({ page }) => {
    await page.goto('/editor/about');
    await expect(page.getByRole('tab', { name: 'Details' })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 400));
    const before = await page.evaluate(() => window.scrollY);
    test.skip(before === 0, 'the page is too short to scroll on this screen');
    await page.getByRole('tab', { name: /^Images/ }).click();
    await expect(page).toHaveURL(/panel=media/);
    // Where it was, or as near as the shorter panel lets it be; never back at the top.
    const { y, max } = await page.evaluate(() => ({
      y: window.scrollY,
      max: document.documentElement.scrollHeight - window.innerHeight,
    }));
    expect(y).toBe(Math.min(before, max));
    expect(y).toBeGreaterThan(0);
  });

  test('editor routes are accessible', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const path of ['/editor', '/editor?kind=page', '/editor/new', '/editor/about']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expectNoSeriousViolations(page, path);
    }
  });

  test('the card in edit mode has no serious or critical accessibility violations, on either side', async ({
    page,
  }) => {
    // Steady state only: mid-animation opacity would make axe sample blended colours.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await startInEditMode(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Edit card' }).click();
    const form = page.getByRole('form', { name: 'Edit card' });
    await expect(form.getByRole('textbox', { name: 'Tagline' })).toBeVisible();
    await expectNoSeriousViolations(page, 'front');
    await form.getByRole('button', { name: 'Contact details' }).click();
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await expectNoSeriousViolations(page, 'contact side');
    await page.getByRole('button', { name: 'Cancel' }).click();
  });
});
