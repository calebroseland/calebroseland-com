import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures.ts";

test.describe("landing", () => {
  test("renders the card, and show more reveals every link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Profiles and links" });
    await expect(nav.getByRole("link", { name: /GitHub/ })).toHaveAttribute(
      "href",
      "https://github.com/calebroseland",
    );
    // Collapsed, the card shows one link per group, like a business card.
    await expect(nav.getByRole("link")).toHaveCount(3);
    await page.getByRole("button", { name: "show more" }).click();
    await expect(page.getByRole("button", { name: "show less" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(await nav.getByRole("link").count()).toBeGreaterThanOrEqual(10);
    await expect(nav.getByRole("heading", { level: 2 })).toHaveCount(3);
  });

  test("turns over to the contact side and back from the keyboard", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Contact information" }).click();
    const close = page.getByRole("button", { name: "Back to links" });
    await expect(close).toBeFocused();
    const contact = page.getByRole("list", { name: "Contact" });
    await expect(contact.getByRole("link", { name: /@/ })).toHaveAttribute("href", /^mailto:/);
    await expect(contact.getByRole("link", { name: /\d{3}/ })).toHaveAttribute("href", /^tel:\+/);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Contact information" })).toBeFocused();
    await expect(contact).toHaveCount(0);
  });

  test("uses the Adobe Fonts kit for the name and the text", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("font-family", /^cortado/);
    await expect(page.locator("body")).toHaveCSS("font-family", /^proxima-nova/);
  });

  test("has no serious or critical accessibility violations on any face of the card", async ({
    page,
  }) => {
    // Steady state only: mid-animation opacity would make axe sample blended colours.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const audit = async (state: string) => {
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(serious, `${state}: ${JSON.stringify(serious, null, 2)}`).toEqual([]);
    };
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await audit("collapsed");
    await page.getByRole("button", { name: "show more" }).click();
    await expect(page.getByRole("heading", { level: 2 }).first()).toHaveCSS("opacity", "1");
    await audit("expanded");
    await page.getByRole("button", { name: "Contact information" }).click();
    await expect(page.getByRole("button", { name: "Back to links" })).toBeVisible();
    await audit("contact side");
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
    // Turning the card is instant: the contact side is fully there on the next frame.
    await page.getByRole("button", { name: "Contact information" }).click();
    await expect(page.getByRole("list", { name: "Contact" })).toBeVisible();
    await expect(page.locator("main section")).toHaveCount(1);
    await expect(page.locator("main section")).toHaveCSS("opacity", "1");
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
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`landing-${scheme}-${testInfo.project.name}.png`, {
        fullPage: true,
      });
    }
  });
});
