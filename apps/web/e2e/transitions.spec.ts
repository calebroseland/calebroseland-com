import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.ts";

/* Page transitions, in every browser project. Each view transition is recorded as it starts: the
   effect in <html data-page>, and which snapshots animate. Where a browser has no view transitions
   the change is instant, and there is nothing to record. */

type Recorded = { page: string | null; vt: string | null; animated: string[]; names: string[] };

async function record(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __vts: Recorded[] };
    w.__vts = [];
    if (typeof document.startViewTransition !== "function") return;
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = ((arg: Parameters<typeof start>[0]) => {
      const t = start(arg);
      void t.ready.then(() =>
        w.__vts.push({
          page: document.documentElement.dataset.page ?? null,
          vt: document.documentElement.dataset.vt ?? null,
          animated: document
            .getAnimations()
            .map((a) => (a.effect as KeyframeEffect | null)?.pseudoElement ?? "")
            .filter(Boolean),
          names: document.getAnimations().map((a) => (a as CSSAnimation).animationName ?? ""),
        }),
      );
      return t;
    }) as typeof document.startViewTransition;
  });
}

const transitions = (page: Page) =>
  page.evaluate(() => (window as unknown as { __vts: Recorded[] }).__vts);
const supported = (page: Page) =>
  page.evaluate(() => typeof document.startViewTransition === "function");
const siteNav = (page: Page) => page.getByRole("navigation", { name: "Site" });

test.describe("page transitions", () => {
  test.beforeEach(async ({ page }) => record(page));

  test("sibling pages crossfade the page while the bar and footer hold", async ({ page }) => {
    await page.goto("/posts");
    await siteNav(page).getByRole("link", { name: "About" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeVisible();
    test.skip(!(await supported(page)), "no view transitions: the change is instant");
    await expect.poll(() => transitions(page)).toHaveLength(1);
    const [t] = await transitions(page);
    expect(t?.page).toBe("fade across");
    expect(t?.animated).toContain("::view-transition-new(root)");
    expect(t?.animated.filter((p) => /site-(footer|bar|nav|name|card)/.test(p))).toEqual([]);
  });

  test("a post slides in forward, and the back button slides it back", async ({ page }) => {
    await page.goto("/posts");
    await page
      .getByRole("main")
      .getByRole("heading", { level: 2 })
      .first()
      .getByRole("link")
      .click();
    await expect(page).toHaveURL(/\/posts\/.+/);
    test.skip(!(await supported(page)), "no view transitions: the change is instant");
    // A new navigation cancels a transition still running, so let this one start first.
    await expect.poll(() => transitions(page)).toHaveLength(1);
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "Posts" })).toBeVisible();
    await expect
      .poll(async () => (await transitions(page)).map((t) => t.page))
      .toEqual(["slide forward", "slide back"]);
  });

  test("a search change swaps without animating", async ({ page }) => {
    await page.goto("/posts");
    await page.getByRole("main").getByRole("link", { name: "meta" }).first().click();
    await expect(page).toHaveURL(/tag=meta/);
    const moving = (await transitions(page)).filter((t) => t.page !== "none" || t.animated.length);
    expect(moving).toEqual([]);
  });

  test("entering from the card crossfades the page rather than sliding it", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(page).toHaveURL(/\/home$/);
    test.skip(!(await supported(page)), "no view transitions: the change is instant");
    await expect.poll(() => transitions(page)).toHaveLength(1);
    const [t] = await transitions(page);
    expect(t?.vt).toBe("enter");
    // The Enter button asks for a crossfade through the link's history state.
    expect(t?.page).toBe("fade forward");
    expect(t?.names.filter((n) => /page-(in|out)/.test(n))).toEqual([]);
  });

  test("a navigation's effect does not leak into the card's own animations", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(page).toHaveURL(/\/home$/);
    test.skip(!(await supported(page)), "no view transitions: the change is instant");
    await expect.poll(() => transitions(page)).toHaveLength(1);
    await page.getByRole("link", { name: /Back to the business card/ }).click();
    await expect.poll(() => transitions(page)).toHaveLength(2);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.page ?? null))
      .toBe(null);
    await page.getByRole("button", { name: /show more/i }).click();
    await expect.poll(() => transitions(page)).toHaveLength(3);
    const expand = (await transitions(page))[2];
    expect(expand?.vt).toBe("expand");
    expect(expand?.page).toBe(null);
  });

  test("reduced motion swaps pages without animating", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/posts");
    await siteNav(page).getByRole("link", { name: "About" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeVisible();
    const moving = (await transitions(page)).filter((t) => t.animated.length > 0);
    expect(moving).toEqual([]);
  });
});
