import { expect, test } from "@playwright/test";

/* Post-deploy checks against a live URL. Kept tiny and fast; @smoke tag for filtering. Paths are
   relative, so a base with a path is kept if a deploy ever has one. */
test.describe("@smoke", () => {
  test("landing renders", async ({ page }) => {
    await page.goto("./");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Profiles and links" }).getByRole("link").first(),
    ).toBeVisible();
  });

  test("health reports the deployed sha", async ({ request, baseURL }) => {
    test.skip(!!process.env.SMOKE_STATIC, "no Worker behind this URL (GitHub Pages backup)");
    const res = await request.get(new URL("api/health", baseURL).toString());
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as { ok: boolean; sha: string };
    expect(body.ok).toBe(true);
    if (process.env.EXPECTED_SHA) expect(body.sha).toBe(process.env.EXPECTED_SHA);
  });

  test("theme toggle works", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: /Theme:/ }).click();
    await expect(page.getByRole("button", { name: /Theme: (Light|Dark|Auto)/ })).toBeVisible();
  });
});
