import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.ts";

/* Page transitions, in every browser project. Each view transition is recorded as it starts: the
   types the router gave it, the card's own kind (data-vt), and which snapshots animate. */

type Recorded = {
  types: string[] | null;
  vt: string | null;
  animated: string[];
  names: string[];
};

async function record(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __vts: Recorded[] };
    w.__vts = [];
    if (typeof document.startViewTransition !== "function") return;
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = ((arg: Parameters<typeof start>[0]) => {
      const t = start(arg);
      const types =
        typeof arg === "object" && arg && "types" in arg ? [...(arg.types ?? [])] : null;
      void t.ready.then(() =>
        w.__vts.push({
          types,
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
const typed = (page: Page) =>
  page.evaluate(() => CSS.supports("selector(:active-view-transition-type(a))"));
const siteNav = (page: Page) => page.getByRole("navigation", { name: "Site" });

test.describe("page transitions", () => {
  test.beforeEach(async ({ page }) => record(page));

  test("sibling pages crossfade while the footer holds its place", async ({ page }) => {
    await page.goto("/posts");
    await siteNav(page).getByRole("link", { name: "About" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeVisible();
    test.skip(!(await typed(page)), "no view-transition types: the browser's own crossfade");
    await expect.poll(() => transitions(page)).toHaveLength(1);
    const [t] = await transitions(page);
    expect(t?.types).toEqual(["page", "page-fade", "page-across"]);
    expect(t?.animated).toContain("::view-transition-new(root)");
    expect(t?.animated).not.toContain("::view-transition-group(site-footer)");
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
    test.skip(!(await typed(page)), "no view-transition types: the browser's own crossfade");
    // A new navigation cancels a transition still running, so let this one start first.
    await expect.poll(() => transitions(page)).toHaveLength(1);
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "Posts" })).toBeVisible();
    await expect
      .poll(async () => (await transitions(page)).map((t) => t.types?.[2]))
      .toEqual(["page-forward", "page-back"]);
  });

  test("a search change is not a page transition", async ({ page }) => {
    await page.goto("/posts");
    await page.getByRole("main").getByRole("link", { name: "meta" }).first().click();
    await expect(page).toHaveURL(/tag=meta/);
    const pages = (await transitions(page)).filter((t) => t.types?.includes("page"));
    expect(pages).toEqual([]);
  });

  test("entering from the card runs the card's own crossfade, not a page slide", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(page).toHaveURL(/\/home$/);
    test.skip(!(await supported(page)), "no view transitions: the change is instant");
    await expect.poll(() => transitions(page)).toHaveLength(1);
    const [t] = await transitions(page);
    expect(t?.vt).toBe("enter");
    expect(t?.types).toBe(null);
    expect(t?.names.filter((n) => /page-(in|out)/.test(n))).toEqual([]);
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
