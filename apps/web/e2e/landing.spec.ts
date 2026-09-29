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
    // Collapsed, the card shows one link per group, like a business card, and the inline Social group
    // its whole row of icons, each named by a tooltip.
    await expect(nav.getByRole("link")).toHaveCount(7);
    if (!test.info().project.name.includes("mobile")) {
      await nav.getByRole("link", { name: /LinkedIn/ }).hover();
      // Base UI's popup takes no tooltip role: the link already has the label as its name.
      await expect(
        page.locator("[data-side][data-open]:not([role])").filter({ hasText: /^LinkedIn$/ }),
      ).toBeVisible();
    }
    await page.getByRole("button", { name: "show more" }).click();
    await expect(page.getByRole("button", { name: "show less" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(await nav.getByRole("link").count()).toBeGreaterThanOrEqual(9);
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

    await expect(page).toHaveURL(/\/contact$/);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Contact information" })).toBeFocused();
    await expect(contact).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
  });

  test("the contact side has its own address, and back and forward turn the card", async ({
    page,
  }) => {
    await page.goto("/contact");
    const contact = page.getByRole("list", { name: "Contact" });
    await expect(contact).toBeVisible();
    await expect(page).toHaveTitle(/^Contact · /);

    await page.getByRole("button", { name: "Back to links" }).click();
    await expect(contact).toHaveCount(0);
    await page.goBack();
    await expect(contact).toBeVisible();
    await expect(page.getByRole("button", { name: "Back to links" })).toBeFocused();
  });

  test("the Writings column opens posts in place", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Profiles and links" });
    await nav.getByRole("link", { name: "Posts" }).click();
    await expect(page).toHaveURL(/\/posts$/);
    await expect(page.getByRole("heading", { level: 1, name: "Posts" })).toBeVisible();
  });

  test("enter opens /posts, and the brand goes to Posts from a page and back to the card from Posts", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Enter" }).click();
    const site = page.getByRole("navigation", { name: "Site" });
    await expect(site).toBeVisible();
    await expect(page).toHaveURL(/\/posts$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await expect(page.getByRole("navigation", { name: "Profiles and links" })).toHaveCount(0);

    // From a page the brand goes to Posts; from Posts it turns back into the card.
    await site.getByRole("link", { name: "About" }).click();
    const brand = page.getByRole("banner").getByRole("link", { name: /Caleb Roseland/ });
    await brand.click();
    await expect(page).toHaveURL(/\/posts$/);
    await brand.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: "Enter" })).toBeVisible();
  });

  test("a click on the empty background enters the site, and stops there", async ({ page }) => {
    await page.goto("/");
    // The handler exists once the app has mounted; the Enter button is the sign of that.
    await expect(page.getByRole("button", { name: "Enter" })).toBeVisible();
    await page.mouse.click(8, 8);
    await expect(page.getByRole("navigation", { name: "Site" })).toBeVisible();
    await expect(page.locator("html")).not.toHaveAttribute("data-vt");

    // Past the card, a background click does nothing.
    const box = await page.getByRole("main").boundingBox();
    if (!box) throw new Error("main has no box");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height - 8);
    await expect(page).toHaveURL(/\/posts$/);
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
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(page.getByRole("navigation", { name: "Site" })).toBeVisible();
    await audit("entered");
  });

  test("the theme menu switches theme, which persists across reload without a flash", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "light");
    await page.getByRole("button", { name: /Theme: Auto/ }).click();
    await page.getByRole("menuitemradio", { name: "Dark" }).click();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await page.reload();
    // The inline script sets the attribute before React mounts; assert it is right at first paint.
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("button", { name: /Theme: Dark/ })).toBeVisible();
  });

  test("a custom theme previews live, saves, and is painted before the app loads", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.goto("/");
    // The colour the page paints for the accent, resolved through every token.
    const accent = () =>
      page.evaluate(() => {
        const probe = document.createElement("span");
        probe.style.color = "var(--color-accent)";
        document.body.append(probe);
        const c = getComputedStyle(probe).color;
        probe.remove();
        return c;
      });
    await page.getByRole("button", { name: /Theme: Auto/ }).click();
    await page.getByRole("menuitem", { name: /New custom theme/ }).click();
    const editor = page.getByRole("dialog", { name: "New theme" });
    await editor.getByRole("radio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const builtInDarkAccent = await accent();
    await editor.getByRole("textbox", { name: "Name" }).fill("Ember");
    await editor.getByRole("textbox", { name: "Accent" }).fill("#e8590c");

    // The relative-colour ramp resolves in this engine: picking a colour changes the painted accent.
    await expect.poll(accent).not.toBe(builtInDarkAccent);
    const previewed = await accent();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await editor.getByRole("button", { name: "Save theme" }).click();
    await expect(editor).toHaveCount(0);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await accent()).toBe(previewed);
    await expect(page.getByRole("button", { name: /Theme: Ember/ })).toBeVisible();
  });

  test("the theme editor has no serious or critical accessibility violations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: /Theme: Auto/ }).click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    // Base UI's invisible focus guards take role="button" in WebKit (for VoiceOver's focus handling);
    // they are the library's, not this page's, and are never reachable as buttons.
    const serious = async () =>
      (
        await new AxeBuilder({ page }).exclude("[data-base-ui-focus-guard]").analyze()
      ).violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(await serious(), "menu").toEqual([]);
    await page.getByRole("menuitem", { name: /New custom theme/ }).click();
    await expect(page.getByRole("dialog", { name: "New theme" })).toBeVisible();
    expect(await serious(), "editor").toEqual([]);
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
