import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures.ts";

test.describe("landing", () => {
  test("renders the profile and every link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Profiles and links" });
    await expect(nav.getByRole("link", { name: /GitHub/ })).toHaveAttribute(
      "href",
      "https://github.com/calebroseland",
    );
    expect(await nav.getByRole("link").count()).toBeGreaterThanOrEqual(10);
  });

  test("has no serious or critical accessibility violations", async ({ page }) => {
    // Steady state only: mid-animation opacity would make axe sample blended colours.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 2 }).first()).toHaveCSS("opacity", "1");
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test("theme cycles and persists across reload without a flash", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "light");
    const toggle = page.getByRole("button", { name: /Theme: Auto/ });
    await toggle.click();
    await expect(page.getByRole("button", { name: /Theme: Light/ })).toBeVisible();
    await page.getByRole("button", { name: /Theme: Light/ }).click();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await page.reload();
    // The inline script sets the attribute before React mounts; assert it is right at first paint.
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("button", { name: /Theme: Dark/ })).toBeVisible();
  });

  test("respects reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const duration = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--duration-normal").trim(),
    );
    expect(duration).toBe("0.01ms");
    // Content is present immediately, no entrance in progress.
    await expect(
      page.getByRole("navigation", { name: "Profiles and links" }).getByRole("heading").first(),
    ).toBeVisible();
  });

  test("skip link is the first focusable and jumps to main", async ({ page }) => {
    await page.goto("/");
    const skip = page.getByRole("link", { name: "Skip to content" });
    // Off-screen until focused. WebKit does not focus links on Tab by default, so focus explicitly.
    await expect(skip).not.toBeInViewport();
    await skip.focus();
    await expect(skip).toBeInViewport();
    const order = await page.evaluate(() => {
      const focusables = [...document.querySelectorAll<HTMLElement>("a[href], button")];
      return focusables.indexOf(document.activeElement as HTMLElement);
    });
    expect(order).toBe(0);
    await skip.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });

  test("looks right", async ({ page }, testInfo) => {
    // Baselines are platform-specific and generated locally with VISUAL=1; CI has none yet (PLAN.md debt log).
    test.skip(!process.env.VISUAL, "set VISUAL=1 to run screenshot comparisons");
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page).toHaveScreenshot(`landing-${scheme}-${testInfo.project.name}.png`, {
        fullPage: true,
      });
    }
  });
});
