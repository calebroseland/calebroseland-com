import { test as base, expect } from "@playwright/test";

/* Every test fails on an unexpected console error. Opt out per test with `test.use({ allowConsoleErrors: true })`. */
export const test = base.extend<{ allowConsoleErrors: boolean }>({
  allowConsoleErrors: [false, { option: true }],
  page: async ({ page, allowConsoleErrors }, use) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));
    // Failed module or asset loads are the usual cause of "Importing a module script failed"; name the URL.
    page.on("requestfailed", (req) => {
      const reason = req.failure()?.errorText ?? "?";
      // A fetch abandoned by navigation is normal; a cancelled script or module import is not.
      const benign =
        /cancel|abort/i.test(reason) &&
        (req.resourceType() === "fetch" || req.resourceType() === "xhr");
      if (!benign) errors.push(`request failed: ${req.url()} (${reason})`);
    });
    page.on("response", (res) => {
      if (res.status() >= 400 && !res.url().includes("/api/"))
        errors.push(`HTTP ${res.status()}: ${res.url()}`);
    });
    await use(page);
    if (!allowConsoleErrors) expect(errors, "unexpected console errors").toEqual([]);
  },
});

export { expect };
