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
    await expect(gallery.getByRole('list').first().getByRole('listitem')).toHaveCount(3);
    await expect(page.getByRole('link', { name: 'Open image 6' })).toBeVisible();
    // An image in running text stays inline and opens nothing.
    await expect(page.getByRole('img', { name: 'a tiny square' })).toBeVisible();
    await expect(page.getByRole('link', { name: /a tiny square/ })).toHaveCount(0);
  });

  test('do not shift the body as they load', async ({ page }) => {
    // Shifts of nodes inside the body, recorded with where they happened. The page arriving moves the
    // footer, and a web font arriving late (CI) reflows text; neither is an image. Images are what this
    // checks, and they load after the fonts here, so shifts count from the moment the fonts are ready.
    await page.addInitScript(() => {
      type Shift = PerformanceEntry & {
        value: number;
        sources: Array<{
          node?: Node;
          previousRect: DOMRectReadOnly;
          currentRect: DOMRectReadOnly;
        }>;
      };
      const w = window as unknown as { __shifts: string[]; __cls: number; __fontsAt: number };
      w.__shifts = [];
      w.__cls = 0;
      w.__fontsAt = Number.POSITIVE_INFINITY;
      void document.fonts.ready.then(() => {
        w.__fontsAt = performance.now();
      });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as Shift[]) {
          const inBody = e.sources.filter(
            (s) => s.node instanceof Element && s.node.closest('.prose'),
          );
          if (inBody.length === 0) {
            continue;
          }
          const after = e.startTime > w.__fontsAt;
          w.__shifts.push(
            `${e.value.toFixed(4)} @${Math.round(e.startTime)}ms${after ? '' : ' (before fonts)'}: `
              + inBody
                .map((s) => {
                  const el = s.node as Element;
                  return `${el.tagName.toLowerCase()}.${el.className} ${Math.round(s.previousRect.y)}→${Math.round(s.currentRect.y)}`;
                })
                .join(', '),
          );
          if (after) {
            w.__cls += e.value;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await openPage(page);
    await page.evaluate(() => document.fonts.ready);
    for (const img of await page.locator('.prose img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect(img).toHaveJSProperty('complete', true);
    }
    const result = await page.evaluate(() => {
      const w = window as unknown as { __shifts: string[]; __cls: number };
      return { cls: w.__cls, shifts: w.__shifts };
    });
    expect(result.cls, result.shifts.join('\n')).toBe(0);
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
    // Shown in the viewer, the image is not also shown on the page behind it.
    // (By selector: with the modal open, the page is out of the accessibility tree.)
    await expect(page.locator('.prose > figure.media').first()).toHaveCSS('visibility', 'hidden');
    // A lone image is a set of one: no counter, no previous or next.
    await expect(viewer(page).getByRole('button', { name: 'Next image' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(viewer(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/images$/);
    await expect(link).toHaveCSS('visibility', 'visible');
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
    // At rest from the first frame: drawn at its own size, not growing out of the page's image.
    const drawn = await image.evaluate((el) =>
      Math.round(el.getBoundingClientRect().width - Number.parseFloat(el.style.width)),
    );
    expect(drawn).toBe(0);
    await page.keyboard.press('Escape');
    await expect(viewer(page)).toHaveCount(0);
  });

  test("shows a gallery's thumbnails, which move the viewer and follow it", async ({ page }) => {
    const inView = (name: RegExp) =>
      strip.getByRole('button', { name }).evaluate((b) => {
        const v = b.closest('ul')?.parentElement?.getBoundingClientRect();
        const r = b.getBoundingClientRect();
        return Boolean(v && r.left >= v.left - 1 && r.right <= v.right + 1);
      });
    // Opened on an image deep in the set, the strip starts there.
    await openPage(page, '?view=g2.20');
    await expect(viewer(page)).toHaveAccessibleName('Image 20 of 30');
    const strip = viewer(page).getByRole('list');
    await expect.poll(() => inView(/^Show image 20:/)).toBe(true);
    await strip.getByRole('button', { name: /^Show image 3:/ }).click();
    await expect(viewer(page)).toHaveAccessibleName('Image 3 of 30');
    await expect(strip.getByRole('button', { name: /^Show image 3:/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await page.keyboard.press('End');
    await expect(viewer(page)).toHaveAccessibleName('Image 30 of 30');
    await expect.poll(() => inView(/^Show image 30:/)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
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

test.describe('inline gallery', () => {
  const gallery = (page: Page) => page.getByRole('figure', { name: 'Gallery, 3 images' });
  const counter = (page: Page) => gallery(page).getByText(/^\d of 3$/);

  test('moves by buttons, thumbnails and keys, with focus following the slide', async ({
    page,
  }) => {
    await openPage(page);
    await gallery(page).scrollIntoViewIfNeeded();
    await expect(counter(page)).toHaveText('1 of 3');
    await expect(gallery(page).getByRole('button', { name: 'Previous image' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await gallery(page).getByRole('button', { name: 'Next image' }).click();
    await expect(counter(page)).toHaveText('2 of 3');
    await expect(gallery(page).getByRole('button', { name: /^Show image 2/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await gallery(page)
      .getByRole('button', { name: /^Show image 3/ })
      .click();
    await expect(counter(page)).toHaveText('3 of 3');
    await expect(gallery(page).getByRole('button', { name: 'Next image' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await page.keyboard.press('Home');
    await expect(counter(page)).toHaveText('1 of 3');
    await expect(gallery(page).getByRole('link', { name: /first in the gallery/ })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(counter(page)).toHaveText('2 of 3');
    await expect(gallery(page).getByRole('link', { name: /second in the gallery/ })).toBeFocused();
    // Presses faster than the track can glide still count, each one.
    await page.keyboard.press('Home');
    await expect(counter(page)).toHaveText('1 of 3');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(counter(page)).toHaveText('3 of 3');
    await expect(gallery(page).getByRole('link', { name: /third in the gallery/ })).toBeFocused();
  });

  test('closing the viewer leaves the gallery on the image it ended on', async ({ page }) => {
    await openPage(page);
    await gallery(page)
      .getByRole('link', { name: /first in the gallery/ })
      .click();
    await expect(viewer(page)).toHaveAccessibleName('Image 1 of 3');
    await expect(page.locator('figure.gallery').first()).toHaveCSS('visibility', 'hidden');
    await expect(viewer(page)).toBeFocused();
    await page.keyboard.press('End');
    await expect(viewer(page)).toHaveAccessibleName('Image 3 of 3');
    await page.keyboard.press('Escape');
    await expect(viewer(page)).toHaveCount(0);
    await expect(counter(page)).toHaveText('3 of 3');
    await expect(gallery(page)).toHaveCSS('visibility', 'visible');
    await expect(gallery(page).getByRole('link', { name: /third in the gallery/ })).toBeFocused();
  });

  test('its controls arrive into room kept for them, moving nothing below', async ({ page }) => {
    let release = () => undefined as void;
    const held = new Promise<void>((r) => {
      release = r;
    });
    await page.route(/components\/viewer\/BodyMedia\.tsx/, async (route) => {
      await held;
      await route.continue();
    });
    await openPage(page);
    const heading = page.getByRole('heading', { level: 2, name: 'A diagram' });
    const before = await heading.evaluate((h) => h.getBoundingClientRect().top + scrollY);
    // Held back, the controls are not there yet.
    await expect(page.locator('[data-controls]')).toHaveCount(0);
    release();
    await expect(counter(page)).toHaveText('1 of 3');
    const after = await heading.evaluate((h) => h.getBoundingClientRect().top + scrollY);
    expect(after).toBe(before);
  });

  test('a long gallery fits the screen, and its thumbnail strip scrolls to the image on show', async ({
    page,
  }) => {
    await openPage(page);
    const long = page.getByRole('figure', { name: 'Gallery, 30 images' });
    await long.scrollIntoViewIfNeeded();
    await expect(long.getByText(/^\d+ of 30$/)).toHaveText('1 of 30');
    // Nothing widens the page, at any width.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const strip = long.locator('[data-thumbs]');
    const inStrip = (name: RegExp) =>
      strip.getByRole('button', { name }).evaluate((b) => {
        const v = b.closest('[data-thumbs]')?.getBoundingClientRect();
        const r = b.getBoundingClientRect();
        return Boolean(v && r.left >= v.left - 1 && r.right <= v.right + 1);
      });
    // The strip starts at its first thumbnail, not centred with both ends cut off.
    expect(await inStrip(/^Show image 1:/)).toBe(true);
    await long.getByRole('link', { name: 'Open image: Long gallery image 1', exact: true }).focus();
    await page.keyboard.press('End');
    await expect(long.getByText(/^\d+ of 30$/)).toHaveText('30 of 30');
    await expect.poll(() => inStrip(/^Show image 30:/)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });

  test('prints as its figures, without controls', async ({ page }) => {
    await openPage(page);
    await expect(counter(page)).toHaveText('1 of 3');
    await page.emulateMedia({ media: 'print' });
    await expect(gallery(page).getByRole('button', { name: 'Next image' })).toBeHidden();
    const display = await gallery(page)
      .locator('.gallery-track')
      .evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe('block');
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

  test('keeps previous and next in the bottom corners, whatever input arrives', async ({
    page,
  }) => {
    await openPage(page, '?view=g1.2');
    const next = viewer(page).getByRole('button', { name: 'Next image' });
    const where = async () => {
      const box = await next.boundingBox();
      const h = await page.evaluate(() => innerHeight);
      return box ? Math.round(h - (box.y + box.height)) : null;
    };
    const first = await where();
    expect(first).not.toBeNull();
    expect(first).toBeLessThan(80);
    // A mouse event on a phone (a paired mouse, or an emulated click) must not move them.
    const center = await page.evaluate(() => [innerWidth / 2, innerHeight / 2]);
    await page.mouse.click(center[0] ?? 0, center[1] ?? 0);
    await expect(viewer(page)).toBeVisible();
    expect(await where()).toBe(first);
    const cdp = await page.context().newCDPSession(page);
    const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
    // A touch tap after it.
    await gesture(cdp, [[w * 0.5, h * 0.4]], [[w * 0.5, h * 0.4]], 1);
    await expect(viewer(page)).toBeVisible();
    expect(await where()).toBe(first);
  });

  test('a gallery swipes natively, and its counter follows', async ({ page }) => {
    await openPage(page);
    const gallery = page.getByRole('figure', { name: 'Gallery, 3 images' });
    await gallery.scrollIntoViewIfNeeded();
    await expect(gallery.getByText('1 of 3')).toBeVisible();
    const box = await gallery.locator('.gallery-track').boundingBox();
    if (!box) {
      throw new Error('no track');
    }
    const cdp = await page.context().newCDPSession(page);
    const y = box.y + box.height / 2;
    await gesture(cdp, [[box.x + box.width * 0.85, y]], [[box.x + box.width * 0.1, y]]);
    await expect(gallery.getByText('2 of 3')).toBeVisible();
  });
});
