import AxeBuilder from '@axe-core/playwright';
import type { CDPSession, Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';

/* The image viewer and inline galleries, on the fixture page built for them (fixtures/content/pages/images). */

const viewer = (page: Page) => page.getByRole('dialog');
const zoomLevel = (page: Page) => viewer(page).getByText(/^\d+%$/);

const openPage = async (page: Page, search = '') => {
  await page.goto(`/images${search}`);
  // With the viewer open, the page behind is hidden from the accessibility tree; wait on the DOM.
  await expect(page.locator('h1')).toHaveText('Images');
};

test.describe('images in a body', () => {
  test('carry their size, a caption from the alt, and a link to the file; adjacent ones form a gallery', async ({
    page,
  }) => {
    await openPage(page);
    const wide = page.getByRole('link', {
      name: 'Open image: A wide orange checkerboard',
      exact: true,
    });
    await expect(wide).toHaveAttribute('href', /wide.*\.png$/);
    await expect(wide.getByRole('img')).toHaveAttribute('width', '1200');
    await expect(wide.getByRole('img')).toHaveAttribute('height', '800');
    await expect(
      page.locator('figcaption', { hasText: 'A wide orange checkerboard' }).first(),
    ).toBeVisible();
    const gallery = page.getByRole('figure', { name: 'Gallery, 3 images' });
    await expect(gallery.getByRole('listitem')).toHaveCount(3);
    await expect(page.getByRole('link', { name: 'Open image 6' })).toBeVisible();
    // An image in running text stays inline and opens nothing.
    await expect(page.getByRole('img', { name: 'a tiny square' })).toBeVisible();
    await expect(page.getByRole('link', { name: /a tiny square/ })).toHaveCount(0);
  });

  test('do not shift the body as they load', async ({ page }) => {
    // Only shifts of nodes inside the body count: the page arriving moves the footer, images must not move text.
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as Array<
          PerformanceEntry & { value: number; sources: Array<{ node?: Node }> }
        >) {
          if (e.sources.some((s) => s.node instanceof Element && s.node.closest('.prose'))) {
            w.__cls += e.value;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await openPage(page);
    for (const img of await page.locator('.prose img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect(img).toHaveJSProperty('complete', true);
    }
    expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBe(0);
  });
});

test.describe('image viewer', () => {
  test('opens from an image, lives in the URL, and closes back to the image with focus and scroll intact', async ({
    page,
  }) => {
    await openPage(page);
    const link = page.getByRole('link', {
      name: 'Open image: A wide orange checkerboard',
      exact: true,
    });
    await link.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => ({ y: scrollY, length: history.length }));
    await link.click();
    await expect(viewer(page)).toBeVisible();
    await expect(viewer(page)).toHaveAccessibleName('Image');
    await expect(viewer(page)).toHaveAccessibleDescription('A wide orange checkerboard');
    await expect(page).toHaveURL(/\?view=s1\.1$/);
    // A lone image is a set of one: no counter, no previous or next.
    await expect(viewer(page).getByRole('button', { name: 'Next image' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(viewer(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/images$/);
    await expect(link).toBeFocused();
    const after = await page.evaluate(() => ({ y: scrollY, length: history.length }));
    expect(after.y).toBe(before.y);
    // Closing went back to the entry it came from: the viewer's entry is ahead, not stacked behind.
    expect(after.length).toBe(before.length + 1);
    await page.goForward();
    await expect(viewer(page)).toBeVisible();
    await page.goBack();
    await expect(viewer(page)).toHaveCount(0);
  });

  test('moves through a gallery by keys and buttons; Back closes, Forward reopens', async ({
    page,
  }) => {
    await openPage(page);
    await page.getByRole('link', { name: /second in the gallery/ }).click();
    await expect(viewer(page)).toHaveAccessibleName('Image 2 of 3');
    // Focus moves into the viewer, so its keys work without a click.
    await expect(viewer(page)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(viewer(page)).toHaveAccessibleName('Image 3 of 3');
    await expect(page).toHaveURL(/\?view=g1\.3$/);
    await expect(
      viewer(page).getByText('Image 3 of 3: A green checkerboard square, third in the gallery'),
    ).toBeAttached();
    await expect(viewer(page).getByRole('button', { name: 'Next image' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await viewer(page).getByRole('button', { name: 'Previous image' }).click();
    await expect(viewer(page)).toHaveAccessibleName('Image 2 of 3');
    await page.keyboard.press('Home');
    await expect(viewer(page)).toHaveAccessibleName('Image 1 of 3');
    await page.goBack();
    await expect(viewer(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/images$/);
    await page.goForward();
    await expect(viewer(page)).toHaveAccessibleName('Image 1 of 3');
  });

  test('a shared link opens on its image; closing replaces the URL rather than leaving the page', async ({
    page,
  }) => {
    await openPage(page, '?view=g1.2');
    await expect(viewer(page)).toHaveAccessibleName('Image 2 of 3');
    const length = await page.evaluate(() => history.length);
    await viewer(page).getByRole('button', { name: 'Close' }).click();
    await expect(viewer(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/images$/);
    expect(await page.evaluate(() => history.length)).toBe(length);
  });

  test('zooms by buttons and keys, within its limits', async ({ page }) => {
    await openPage(page, '?view=s1.1');
    await expect(zoomLevel(page)).toHaveText('100%');
    await viewer(page).getByRole('button', { name: 'Zoom in' }).click();
    await expect(zoomLevel(page)).toHaveText('150%');
    await page.keyboard.press('+');
    await page.keyboard.press('+');
    await page.keyboard.press('+');
    // The wide image is 1200 px: at most twice its fit, never past four times.
    await expect(zoomLevel(page)).toHaveText(/^(2\d\d|3\d\d|400)%$/);
    await page.keyboard.press('0');
    await expect(zoomLevel(page)).toHaveText('100%');
    await viewer(page).getByRole('button', { name: 'Zoom out' }).click();
    await expect(zoomLevel(page)).toHaveText('100%');
  });

  test('under reduced motion, opens and closes in place, without growing or shrinking', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openPage(page);
    await page.getByRole('link', { name: /second in the gallery/ }).click();
    const image = viewer(page).locator('img').first();
    await expect(image).toBeVisible();
    expect(await image.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
    await page.keyboard.press('Escape');
    await expect(viewer(page)).toHaveCount(0);
  });

  test('has no serious accessibility violations while open', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openPage(page, '?view=g1.1');
    await expect(viewer(page)).toBeVisible();
    const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test.describe('without the viewer', () => {
    test.use({ allowConsoleErrors: true });

    test('an image still opens its file when the viewer cannot load', async ({ page }) => {
      await page.route(/components\/viewer\/ImageViewer\.tsx/, (route) => route.abort());
      await openPage(page);
      await page
        .getByRole('link', { name: 'Open image: A wide orange checkerboard', exact: true })
        .click();
      await expect(page).toHaveURL(/wide.*\.png$/);
    });
  });
});

/* Touch, through Chromium's DevTools protocol: Playwright has no multi-touch of its own. */
test.describe('image viewer on a touch screen', () => {
  test.skip(
    ({ browserName, isMobile }) => browserName !== 'chromium' || !isMobile,
    'touch runs on the emulated phone',
  );

  type Pt = [number, number];
  const touch = async (
    cdp: CDPSession,
    type: 'touchStart' | 'touchMove' | 'touchEnd',
    points: Pt[],
  ) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map(([x, y], id) => ({ x, y, id })),
    });
  /** Fingers moving together from `from` to `to` in steps. */
  const gesture = async (cdp: CDPSession, from: Pt[], to: Pt[], steps = 8) => {
    await touch(cdp, 'touchStart', from);
    for (let i = 1; i <= steps; i++) {
      await touch(
        cdp,
        'touchMove',
        from.map(([x, y], k) => [
          x + (((to[k] ?? [x, y])[0] - x) * i) / steps,
          y + (((to[k] ?? [x, y])[1] - y) * i) / steps,
        ]),
      );
    }
    await touch(cdp, 'touchEnd', []);
  };

  test('swipes between images, pinches to zoom, and swipes down to close', async ({ page }) => {
    await openPage(page, '?view=g1.1');
    await expect(viewer(page)).toHaveAccessibleName('Image 1 of 3');
    const cdp = await page.context().newCDPSession(page);
    const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
    const mid: Pt = [w / 2, h / 2];

    await gesture(cdp, [[w * 0.8, h / 2]], [[w * 0.2, h / 2]]);
    await expect(viewer(page)).toHaveAccessibleName('Image 2 of 3');

    // A short drag springs back.
    await gesture(cdp, [[w * 0.6, h / 2]], [[w * 0.5, h / 2]]);
    await page.waitForTimeout(400);
    await expect(viewer(page)).toHaveAccessibleName('Image 2 of 3');

    await gesture(
      cdp,
      [
        [mid[0] - 40, mid[1]],
        [mid[0] + 40, mid[1]],
      ],
      [
        [mid[0] - 140, mid[1]],
        [mid[0] + 140, mid[1]],
      ],
    );
    await expect(zoomLevel(page)).not.toHaveText('100%');
    await page.keyboard.press('0');
    await expect(zoomLevel(page)).toHaveText('100%');

    // Starting at the screen's edge belongs to the system's back swipe.
    await gesture(cdp, [[4, h / 2]], [[w * 0.7, h / 2]]);
    await expect(viewer(page)).toHaveAccessibleName('Image 2 of 3');

    await gesture(cdp, [mid], [[mid[0], mid[1] + 260]]);
    await expect(viewer(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/images$/);
  });
});
