import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures.ts";

test.describe("studio auth", () => {
  test("unauthenticated visit redirects to login with returnTo", async ({ page }) => {
    await page.goto("/studio");
    await expect(page).toHaveURL(/\/studio\/login\?returnTo=/);
    await expect(page.getByRole("heading", { level: 1, name: "Studio" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in with GitHub" })).toBeDisabled();
    await expect(
      page.getByText("GitHub sign-in isn't configured for this environment."),
    ).toBeVisible();
  });

  test("developer fake sign-in reaches the studio, persists across reload, and signs out", async ({
    page,
  }) => {
    await page.goto("/studio/login");
    await page.getByRole("group").getByText("Developer options").click();
    await page.getByRole("button", { name: "Use local fake GitHub" }).click();
    await expect(page).toHaveURL(/\/studio\/?$/);
    await expect(page.getByText("fake-user")).toBeVisible();
    await expect(page.getByText("local fake GitHub")).toBeVisible();
    await page.reload();
    await expect(page.getByText("fake-user")).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/studio\/login/);
    // Let the login route finish loading before navigating again (WebKit cancels in-flight imports otherwise).
    await expect(page.getByRole("button", { name: "Sign in with GitHub" })).toBeVisible();
    await page.goto("/studio");
    await expect(page).toHaveURL(/\/studio\/login/);
  });

  test("callback without a handshake fails closed", async ({ page }) => {
    await page.goto("/studio/callback?code=abc&state=xyz");
    await expect(page).toHaveURL(/\/studio\/login\?error=/);
    await expect(page.getByRole("alert")).toContainText("Sign-in didn't complete");
  });

  test("login page is accessible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/studio/login");
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
});
