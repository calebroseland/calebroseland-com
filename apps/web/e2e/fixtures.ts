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
    await use(page);
    if (!allowConsoleErrors) expect(errors, "unexpected console errors").toEqual([]);
  },
});

export { expect };
