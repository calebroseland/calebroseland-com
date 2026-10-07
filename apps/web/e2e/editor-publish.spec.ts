import { expect, test } from './fixtures.ts';

const signInFake = async (page: import('@playwright/test').Page) => {
  await page.goto('/login');
  await page.evaluate(() => localStorage.removeItem('crc:fake-github'));
  await page.getByText('Developer options').click();
  await page.getByRole('button', { name: 'Use local fake GitHub' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Editor' })).toBeVisible();
  await expect(page.getByText('fake-user')).toBeVisible();
};

test.describe('editor publish', () => {
  test('the full loop: draft → save → pull request → merge → live post, with the branch cleaned up', async ({
    page,
  }) => {
    await signInFake(page);
    await page.getByRole('link', { name: 'New entry' }).click();
    await page.getByLabel('Title').fill('Publish Me');
    await page.getByRole('button', { name: 'Create post' }).click();
    await expect(page).toHaveURL(/\/editor\/publish-me/);

    await page.getByRole('textbox', { name: 'Post body' }).click();
    await page.keyboard.type('Ready to ship.');
    // Uncheck draft so it will appear on the site.
    await page.getByRole('checkbox', { name: /Draft/ }).uncheck();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Publish' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Publish “Publish Me”');
    await dialog.getByRole('button', { name: 'Open pull request' }).click();
    await expect(dialog.getByRole('status')).toContainText(/Pull request #\d+ is ready to merge/);
    await dialog.getByRole('button', { name: 'Merge and publish' }).click();

    // Fake backend has no deploy; the flow navigates straight to the post route.
    await expect(page).toHaveURL(/\/posts\/publish-me$/);
    await expect(page.getByRole('status').filter({ hasText: 'Published' })).toBeVisible();

    await page.goto('/editor');
    await expect(page.getByRole('region', { name: /^In progress/ })).toHaveCount(0);
    const live = page.getByRole('region', { name: /^Published/ });
    await expect(live.getByRole('link', { name: 'Publish Me' })).toBeVisible();
    await expect(
      live
        .getByRole('listitem')
        .filter({ has: page.getByRole('link', { name: 'Publish Me' }) })
        .getByRole('button', { name: 'Edit' }),
    ).toBeVisible();
  });

  test('publishing with unsaved changes is blocked until saved', async ({ page }) => {
    await signInFake(page);
    await page.getByRole('link', { name: 'New entry' }).click();
    await page.getByLabel('Title').fill('Dirty');
    await page.getByRole('button', { name: 'Create post' }).click();
    await expect(page).toHaveURL(/\/editor\/dirty/);
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();
    await page.getByRole('textbox', { name: 'Post body' }).click();
    await page.keyboard.type('unsaved');
    await page.getByRole('button', { name: 'Publish' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('You have unsaved changes');
    await expect(dialog.getByRole('button', { name: 'Open pull request' })).toBeDisabled();
  });

  test('a non-mergeable pull request is explained and not force-merged', async ({ page }) => {
    await signInFake(page);
    await page.getByRole('link', { name: 'New entry' }).click();
    await page.getByLabel('Title').fill('Conflicted');
    await page.getByRole('button', { name: 'Create post' }).click();
    await expect(page).toHaveURL(/\/editor\/conflicted/);
    await page.getByRole('button', { name: 'Publish' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Open pull request' }).click();
    await expect(page.getByRole('dialog').getByRole('status')).toContainText(/ready to merge/);
    // Flip the fake PR to non-mergeable, as GitHub would after master moves.
    await page.evaluate(() => {
      const raw = localStorage.getItem('crc:fake-github');
      if (!raw) {
        throw new Error('fake state missing');
      }
      const state = JSON.parse(raw);
      for (const pr of state.pulls) {
        pr.mergeable = false;
      }
      localStorage.setItem('crc:fake-github', JSON.stringify(state));
    });
    await page.reload();
    await page.getByRole('button', { name: 'Publish' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('status')).toContainText("can't be merged automatically");
    await expect(dialog.getByRole('button', { name: 'Merge and publish' })).toHaveCount(0);
    await expect(dialog.getByRole('link', { name: 'Resolve on GitHub.' })).toBeVisible();
  });
});
