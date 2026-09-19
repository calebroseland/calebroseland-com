import { defineConfig, devices } from "@playwright/test";
import { scratchContentDir } from "./e2e/global-setup.ts";

/** Specs that mutate the shared content directory, and so cannot run beside anything else. */
const WRITES_FILES = /studio-local\.spec\.ts/;

const port = 5173;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  testIgnore: ["**/smoke/**"],
  fullyParallel: true,
  // Four projects share one dev server, and the emulated phone is the slowest of them. The default
  // 30s is tight enough under that contention to fail a test that is only slow, not broken.
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    // Backends that write files do so here, never in the repository's content/.
    env: { CRC_CONTENT_DIR: scratchContentDir },
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: WRITES_FILES },
    { name: "webkit", use: { ...devices["Desktop Safari"] }, testIgnore: WRITES_FILES },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: WRITES_FILES },
    {
      // Working-tree mode writes real files on the one dev server every project shares, so it runs
      // after the others rather than beside them, and in a single browser: the studio it drives is
      // the same one the other projects already cover on all three.
      name: "working-tree",
      testMatch: WRITES_FILES,
      dependencies: ["chromium", "webkit", "mobile"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
