import { defineConfig, devices } from "@playwright/test";

// BASE_URL is the deployed origin. The fallback only exists so tooling can load this file.
const baseURL = process.env.BASE_URL ?? "http://localhost:5173";

/* Runs against a deployed URL. No web server, one browser, fast. */
export default defineConfig({
  testDir: "./e2e/smoke",
  retries: 2,
  reporter: process.env.CI ? [["github"]] : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
