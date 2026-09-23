import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures.ts";

test.describe("editor auth", () => {
  test("unauthenticated visit redirects to login with returnTo", async ({ page }) => {
    await page.goto("/editor");
    await expect(page).toHaveURL(/\/login\?returnTo=/);
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in with GitHub" })).toBeDisabled();
    await expect(
      page.getByText("GitHub sign-in isn't configured for this environment."),
    ).toBeVisible();
  });

  test("developer fake sign-in reaches the editor, persists across reload, and signs out", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("group").getByText("Developer options").click();
    await page.getByRole("button", { name: "Use local fake GitHub" }).click();
    await expect(page).toHaveURL(/\/editor\/?$/);
    await expect(page.getByText("fake-user")).toBeVisible();
    await expect(page.getByText("local fake GitHub")).toBeVisible();
    await page.reload();
    await expect(page.getByText("fake-user")).toBeVisible();
    // Signing out leaves the editing routes for the site, and they are guarded again afterwards.
    await page.getByRole("button", { name: /^Account:/ }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/home$/);
    // Wait for the session to be gone, not just the redirect to start.
    await expect(page.getByRole("button", { name: /^Account: signed out/ })).toBeVisible();
    await page.goto("/editor");
    await expect(page).toHaveURL(/\/login/);
  });

  test("callback without a handshake fails closed", async ({ page }) => {
    await page.goto("/login/callback?code=abc&state=xyz");
    await expect(page).toHaveURL(/\/login\?error=/);
    await expect(page.getByRole("alert").filter({ hasText: "Sign-in" })).toContainText(
      "Sign-in didn't complete",
    );
  });

  test("login page is accessible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/login");
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
});
