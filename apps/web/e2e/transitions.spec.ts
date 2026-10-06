import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';

/* Page transitions, in every browser project. Each view transition is recorded as it starts: the
   types the router gave it, the card's own kind (data-vt), and which snapshots animate. */

type Recorded = {
  types: string[] | null;
  vt: string | null;
  animated: string[];
  names: string[];
  /** How the old footer snapshot is shown: `none` means the footer switches without blending. */
  oldFooter: string;
};

const record = async (page: Page) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __vts: Recorded[] };
    w.__vts = [];
    if (typeof document.startViewTransition !== 'function') {
      return;
    }
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = ((arg: Parameters<typeof start>[0]) => {
      const t = start(arg);
      const types =
        typeof arg === 'object' && arg && 'types' in arg ? [...(arg.types ?? [])] : null;
      void t.ready.then(() =>
        w.__vts.push({
          types,
          vt: document.documentElement.dataset.vt ?? null,
          animated: document
            .getAnimations()
            .map((a) => (a.effect as KeyframeEffect | null)?.pseudoElement ?? '')
            .filter(Boolean),
          names: document.getAnimations().map((a) => (a as CSSAnimation).animationName ?? ''),
          oldFooter: getComputedStyle(
            document.documentElement,
            '::view-transition-old(site-footer)',
          ).display,
        }),
      );
      return t;
    }) as typeof document.startViewTransition;
  });
};

const transitions = (page: Page) =>
  page.evaluate(() => (window as unknown as { __vts: Recorded[] }).__vts);
const supported = (page: Page) =>
  page.evaluate(() => typeof document.startViewTransition === 'function');
const typed = (page: Page) =>
  page.evaluate(() => CSS.supports('selector(:active-view-transition-type(a))'));
const siteNav = (page: Page) => page.getByRole('navigation', { name: 'Site' });

test.describe('page transitions', () => {
  test.beforeEach(async ({ page }) => record(page));

  test('sibling pages crossfade while the footer holds its place', async ({ page }) => {
    await page.goto('/posts');
    await siteNav(page).getByRole('link', { name: 'About' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible();
    test.skip(!(await typed(page)), "no view-transition types: the browser's own crossfade");
    await expect.poll(() => transitions(page)).toHaveLength(1);
    const [t] = await transitions(page);
    expect(t?.types).toEqual(['page', 'page-fade', 'page-across']);
    expect(t?.animated).toContain('::view-transition-new(root)');
    expect(t?.animated).not.toContain('::view-transition-group(site-footer)');
  });

  test('turning the card between its front and contact side is not a page transition', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Contact information' }).click();
    await expect(page).toHaveURL(/\/contact$/);
    await page.goBack();
    await expect(page.getByRole('button', { name: 'Contact information' })).toBeVisible();
    expect(await transitions(page)).toEqual([]);
  });

  test('a post zooms in going forward, and the back button zooms back out', async ({ page }) => {
    await page.goto('/posts');
    await page
      .getByRole('main')
      .getByRole('heading', { level: 2 })
      .first()
      .getByRole('link')
      .click();
    await expect(page).toHaveURL(/\/posts\/.+/);
    test.skip(!(await typed(page)), "no view-transition types: the browser's own crossfade");
    // A new navigation cancels a transition still running, so let this one start first.
    await expect.poll(() => transitions(page)).toHaveLength(1);
    await page.goBack();
    await expect(page.getByRole('heading', { level: 1, name: 'Posts' })).toBeVisible();
    await expect
      .poll(async () => (await transitions(page)).map((t) => t.types?.[2]))
      .toEqual(['page-forward', 'page-back']);
    for (const t of await transitions(page)) {
      expect(t.names.join(' ')).toMatch(/page-out.*page-in|page-in.*page-out/);
      // The footer is lifted out of the zooming page and switches in one frame, with nothing to blend.
      expect(t.oldFooter).toBe('none');
      expect(t.animated.filter((p) => p.includes('site-footer'))).toEqual([]);
    }
  });

  test('a search change is not a page transition', async ({ page }) => {
    await page.goto('/posts');
    await page.getByRole('main').getByRole('link', { name: 'meta' }).first().click();
    await expect(page).toHaveURL(/tag=meta/);
    const pages = (await transitions(page)).filter((t) => t.types?.includes('page'));
    expect(pages).toEqual([]);
  });

  test("entering from the card runs the card's own crossfade, not a page zoom", async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Enter' }).click();
    await expect(page).toHaveURL(/\/posts$/);
    test.skip(!(await supported(page)), 'no view transitions: the change is instant');
    await expect.poll(() => transitions(page)).toHaveLength(1);
    const [t] = await transitions(page);
    expect(t?.vt).toBe('enter');
    expect(t?.types).toBe(null);
    expect(t?.names.filter((n) => /page-(in|out)/.test(n))).toEqual([]);
  });

  test("the footer's Contact link turns the page back into the card, as the brand does", async ({
    page,
  }) => {
    await page.goto('/posts');
    await page.getByRole('contentinfo').getByRole('link', { name: 'Contact', exact: true }).click();
    await expect(page).toHaveURL(/\/contact$/);
    await expect(page.getByRole('list', { name: 'Contact' })).toBeVisible();
    test.skip(!(await supported(page)), 'no view transitions: the change is instant');
    await expect.poll(() => transitions(page)).toHaveLength(1);
    const [t] = await transitions(page);
    expect(t?.vt).toBe('leave');
    expect(t?.types).toBe(null);
  });

  test('the palette turns a page back into the card by the same morph as the footer', async ({
    page,
  }) => {
    const palette = async (query: string) => {
      await expect(page.getByRole('button', { name: 'Search and commands' })).toBeVisible();
      await page.getByRole('button', { name: 'Search and commands' }).click();
      await page.getByRole('combobox', { name: 'Search commands' }).fill(query);
      await page.keyboard.press('Enter');
    };
    await page.goto('/posts');
    await palette('Contact');
    await expect(page).toHaveURL(/\/contact$/);
    await expect(page.getByRole('list', { name: 'Contact' })).toBeVisible();
    test.skip(!(await supported(page)), 'no view transitions: the change is instant');
    await expect.poll(() => transitions(page)).toHaveLength(1);
    expect((await transitions(page))[0]?.vt).toBe('leave');
  });

  test('expanding the footer morphs each link, not just the page', async ({ page }) => {
    await page.goto('/posts');
    await page.getByRole('button', { name: 'Expand the footer' }).click();
    await expect(page.getByRole('button', { name: 'Collapse the footer' })).toBeVisible();
    test.skip(!(await supported(page)), 'no view transitions: the change is instant');
    await expect.poll(() => transitions(page)).toHaveLength(1);
    const [t] = await transitions(page);
    expect(t?.vt).toBe('footer');
    expect(t?.animated).toContain('::view-transition-group(footer-link-0-0)');
  });

  test('reduced motion swaps pages without animating', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/posts');
    await siteNav(page).getByRole('link', { name: 'About' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible();
    const moving = (await transitions(page)).filter((t) => t.animated.length > 0);
    expect(moving).toEqual([]);
  });
});
