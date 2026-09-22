import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures.ts";

test.describe("posts", () => {
  test("list → detail → back restores the list, with focus moved to the heading", async ({
    page,
  }) => {
    await page.goto("/posts");
    await expect(page.getByRole("heading", { level: 1, name: "Posts" })).toBeVisible();
    // Pick the fixture with a code block explicitly; in dev the newest entry is a draft without one.
    await page
      .getByRole("heading", { level: 2 })
      .getByRole("link", { name: "Hello, placeholder" })
      .click();
    await expect(page).toHaveURL(/\/posts\/hello-placeholder$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hello, placeholder");
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await expect(page.locator("pre.shiki").first()).toBeVisible();
    await expect(page.getByRole("img", { name: "A teal placeholder hero" })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "Posts" })).toBeVisible();
  });

  test("tag filter is a search param and can be cleared", async ({ page }) => {
    await page.goto("/posts");
    await page.getByRole("list", { name: "Tags" }).getByRole("link", { name: "meta" }).click();
    await expect(page).toHaveURL(/\?tag=meta$/);
    await expect(page.getByRole("main").getByRole("heading", { level: 2 })).toHaveCount(1);
    await page.getByRole("link", { name: "Clear filter" }).click();
    await expect(page).toHaveURL(/\/posts$/);
    expect(await page.getByRole("main").getByRole("heading", { level: 2 }).count()).toBeGreaterThan(
      1,
    );
  });

  test("the bar stays at the top while a long post scrolls, without widening the page", async ({
    page,
  }) => {
    await page.goto("/posts/hello-placeholder");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 900));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    const bar = await page.getByRole("banner").boundingBox();
    expect(bar?.y).toBe(0);
    await expect(page.getByRole("button", { name: /Theme/ })).toBeInViewport();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });

  test("unknown post shows the not-found state", async ({ page }) => {
    await page.goto("/posts/does-not-exist");
    await expect(
      page.getByRole("heading", { level: 1, name: "That post isn't here." }),
    ).toBeVisible();
  });

  test("about page renders from content/pages", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeVisible();
  });

  test("code recolours on theme switch without reload", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.goto("/posts/hello-placeholder");
    const token = page.locator("pre.shiki span span").first();
    const light = await token.evaluate((el) => getComputedStyle(el).color);
    await page.getByRole("button", { name: /Theme: Auto/ }).click();
    await page.getByRole("menuitemradio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const dark = await token.evaluate((el) => getComputedStyle(el).color);
    expect(dark).not.toBe(light);
  });

  test("list and detail have no serious or critical accessibility violations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const path of ["/posts", "/posts/hello-placeholder", "/about"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(serious, `${path}: ${JSON.stringify(serious, null, 2)}`).toEqual([]);
    }
  });

  test("feed and sitemap are served", async ({ request }) => {
    const feed = await request.get("/feed.xml");
    expect(feed.ok()).toBe(true);
    expect(await feed.text()).toContain("<rss");
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBe(true);
  });
});
