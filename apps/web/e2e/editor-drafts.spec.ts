import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures.ts';

/* Full local loop against the in-memory fake GitHub: create → write → image → save → reload → conflict. */

async function signInFake(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.evaluate(() => localStorage.removeItem('crc:fake-github'));
  await page.getByText('Developer options').click();
  await page.getByRole('button', { name: 'Use local fake GitHub' }).click();
  await expect(page).toHaveURL(/\/editor\/?$/);
  // Let the board finish loading before the test navigates again; WebKit cancels in-flight module imports otherwise.
  await expect(page.getByRole('heading', { level: 1, name: 'Editor' })).toBeVisible();
  await expect(page.getByText('fake-user')).toBeVisible();
}

// 1x1 PNG
const pngBytes = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

test.describe('editor drafts', () => {
  test('create a draft, write, add an image with alt text, save, and see it on the board', async ({
    page,
  }) => {
    await signInFake(page);
    // The fake starts as a copy of content/: its entries are published, and nothing is in progress.
    await expect(page.getByRole('region', { name: /^Published/ })).toBeVisible();
    await expect(page.getByRole('region', { name: /^In progress/ })).toHaveCount(0);

    await page.getByRole('link', { name: 'New entry' }).click();
    await page.getByLabel('Title').fill('Hello Draft');
    await expect(page.getByRole('textbox', { name: 'Slug' })).toHaveValue('hello-draft');
    await page.getByRole('button', { name: 'Create post' }).click();
    await expect(page).toHaveURL(/\/editor\/hello-draft/);
    await expect(page.getByRole('heading', { level: 1, name: 'Hello Draft' })).toBeVisible();
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();

    // The editor column must not collapse: Center's auto margins once disabled grid stretch, which
    // starved the size-container child and wrapped the toolbar into a tall vertical strip.
    const editorBox = await page.getByRole('textbox', { name: 'Post body' }).boundingBox();
    expect(editorBox?.width ?? 0).toBeGreaterThan(300);
    const toolbarBox = await page.getByRole('toolbar', { name: 'Formatting' }).boundingBox();
    expect(toolbarBox?.height ?? 999).toBeLessThan(120);

    const body = page.getByRole('textbox', { name: 'Post body' });
    await body.click();
    await page.keyboard.type('First paragraph of the post.');
    await expect(page.getByText('Unsaved changes')).toBeVisible();

    // Toolbar is an APG toolbar: one tab stop, arrows move.
    const bold = page.getByRole('button', { name: /^Bold/ });
    await bold.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('button', { name: /^Italic/ })).toBeFocused();

    await page
      .getByRole('button', { name: 'Insert image' })
      .click({ trial: true })
      .catch(() => {});
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: pngBytes });
    await expect(page.getByRole('tab', { name: /Images \(1\)/ })).toBeVisible();

    // Saving without alt text is blocked and focuses the media panel.
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'alt text' })).toContainText(
      'Add alt text for 1 image.',
    );
    await page.getByLabel(/Alt text for photo\.png/).fill('A tiny test image');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Committed' })).toContainText(
      'Committed to drafts/hello-draft',
    );
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();
    // Saving must not rebuild the editor from the pre-save cache and blank the body.
    await expect(page.getByRole('textbox', { name: 'Post body' })).toContainText(
      'First paragraph of the post.',
    );

    await page.getByRole('link', { name: '← Editor' }).click();
    await expect(page.getByRole('link', { name: 'hello-draft' })).toBeVisible();
    await expect(page.getByText('In progress (1)')).toBeVisible();
  });

  test('unsaved edits survive a reload and can be discarded', async ({ page }) => {
    await signInFake(page);
    await page.getByRole('link', { name: 'New entry' }).click();
    await page.getByLabel('Title').fill('Persist Me');
    await page.getByRole('button', { name: 'Create post' }).click();
    await expect(page).toHaveURL(/\/editor\/persist-me/);
    await page.getByRole('textbox', { name: 'Post body' }).click();
    await page.keyboard.type('Not yet saved');
    await expect(page.getByText('Unsaved changes')).toBeVisible();
    await page.waitForFunction(() => localStorage.getItem('crc:buffer:drafts/persist-me') !== null);
    await page.reload();
    await expect(page.getByRole('status').filter({ hasText: 'Restored' })).toContainText(
      'Restored unsaved changes from this device.',
    );
    await expect(page.getByRole('textbox', { name: 'Post body' })).toContainText('Not yet saved');
    await page.getByRole('button', { name: 'Discard local changes' }).click();
    await expect(page.getByRole('textbox', { name: 'Post body' })).not.toContainText(
      'Not yet saved',
    );
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  });

  test('Close goes back to the list and keeps unsaved edits for next time', async ({ page }) => {
    await signInFake(page);
    await page.getByRole('link', { name: 'New entry' }).click();
    await page.getByLabel('Title').fill('Close Me');
    await page.getByRole('button', { name: 'Create post' }).click();
    await expect(page).toHaveURL(/\/editor\/close-me/);
    await page.getByRole('textbox', { name: 'Post body' }).click();
    await page.keyboard.type('Half a thought');
    // Straight away, inside the autosave debounce: closing writes the edit down itself.
    await page.getByRole('link', { name: 'Close' }).click();
    await expect(page).toHaveURL(/\/editor\/?$/);
    await expect(page.getByRole('status').filter({ hasText: 'kept on this device' })).toBeVisible();
    // A draft branch with nothing published under its slug is listed by the slug.
    await page.getByRole('link', { name: 'close-me' }).first().click();
    await expect(page.getByRole('textbox', { name: 'Post body' })).toContainText('Half a thought');
  });

  test('a stale head shows the conflict dialog and nothing is overwritten silently', async ({
    page,
  }) => {
    await signInFake(page);
    await page.getByRole('link', { name: 'New entry' }).click();
    await page.getByLabel('Title').fill('Conflict');
    await page.getByRole('button', { name: 'Create post' }).click();
    await expect(page).toHaveURL(/\/editor\/conflict/);
    await page.getByRole('textbox', { name: 'Post body' }).click();
    await page.keyboard.type('mine');
    await page.waitForFunction(() => localStorage.getItem('crc:buffer:drafts/conflict') !== null);
    // Simulate another writer moving the branch before our save.
    await page.evaluate(() => {
      const raw = localStorage.getItem('crc:fake-github');
      if (!raw) {
        throw new Error('fake state missing');
      }
      const state = JSON.parse(raw);
      state.conflictOnce = true;
      localStorage.setItem('crc:fake-github', JSON.stringify(state));
    });
    await page.reload();
    await expect(page.getByRole('status').filter({ hasText: 'Restored' })).toContainText(
      'Restored unsaved changes',
    );
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText('This post changed on GitHub');
    await dialog.getByRole('button', { name: 'Overwrite' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Committed' })).toContainText(
      'Committed to drafts/conflict',
    );
  });

  test('the card itself edits the profile: links reorder from the keyboard and save to drafts/profile', async ({
    page,
  }) => {
    await signInFake(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Edit card' }).click();
    const form = page.getByRole('form', { name: 'Edit card' });
    await expect(form.getByText('Saves to drafts/profile.')).toBeVisible();

    const handle = form.getByRole('button', { name: /^Move GitHub\./ });
    await handle.focus();
    await page.keyboard.press('ArrowDown');
    await expect(handle).toBeFocused();
    await expect(page.getByText(/GitHub moved to position 2 of 3/)).toBeAttached();
    await expect(form.getByRole('textbox', { name: /^Label for / }).nth(1)).toHaveValue('GitHub');

    await form.getByRole('button', { name: 'Save card' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved to' })).toContainText(
      'Saved to drafts/profile',
    );
    await expect(form).toHaveCount(0);
  });

  test('the card edits in place: a label, an address and a removal right on the links', async ({
    page,
  }) => {
    await signInFake(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Edit card' }).click();
    const form = page.getByRole('form', { name: 'Edit card' });
    // In place: the name is a field on the card, not a form on a turned-over face.
    await expect(form.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(/\S/);

    await form.getByRole('textbox', { name: 'Label for Gists' }).fill('Snippets');
    await form
      .getByRole('textbox', { name: 'Address for Snippets' })
      .fill('https://gist.github.com/someone');
    await form.getByRole('button', { name: 'Remove vue-dom-portal' }).click();
    await expect(page.getByText('Removed vue-dom-portal')).toBeAttached();
    await expect(form.getByRole('textbox', { name: 'Label for vue-dom-portal' })).toHaveCount(0);

    await form.getByRole('button', { name: 'Save card' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved to' })).toBeVisible();
    await expect(form).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit card' })).toBeFocused();
  });

  test('the card in edit mode has no serious or critical accessibility violations, on either side', async ({
    page,
  }) => {
    // Steady state only: mid-animation opacity would make axe sample blended colours.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await signInFake(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Edit card' }).click();
    const form = page.getByRole('form', { name: 'Edit card' });
    await expect(form.getByRole('textbox', { name: 'Tagline' })).toBeVisible();
    const audit = async (state: string) => {
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      expect(serious, `${state}: ${JSON.stringify(serious, null, 2)}`).toEqual([]);
    };
    await audit('front');
    await form.getByRole('button', { name: 'Contact details' }).click();
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await audit('contact side');
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test("the user menu opens the editor, whose Pages filter lists the site's pages", async ({
    page,
  }) => {
    await signInFake(page);
    await page.goto('/home');
    await page.getByRole('button', { name: /^Account:/ }).click();
    await page.getByRole('menuitem', { name: 'Editor' }).click();
    await expect(page).toHaveURL(/\/editor\/?$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Editor' })).toBeVisible();

    const filters = page.getByRole('navigation', { name: 'Show' });
    await filters.getByRole('link', { name: /^Pages/ }).click();
    await expect(page).toHaveURL(/\/editor\/?\?kind=page$/);
    await expect(filters.getByRole('link', { name: /^Pages/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    // In dev the fake repository starts as a copy of content/, so the site's pages are listed.
    const board = page.getByRole('main');
    await expect(board.getByRole('link', { name: 'About', exact: true })).toBeVisible();
    await expect(board.getByRole('link', { name: /placeholder/i })).toHaveCount(0);
    await page.getByRole('link', { name: 'New page' }).click();
    await expect(page).toHaveURL(/\/editor\/new\?kind=page/);
    await expect(page.getByRole('radio', { name: 'page' })).toBeChecked();
  });

  test('editor routes are accessible', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await signInFake(page);
    for (const path of ['/editor', '/editor?kind=page', '/editor/new']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      expect(serious, `${path}: ${JSON.stringify(serious, null, 2)}`).toEqual([]);
    }
  });
});
