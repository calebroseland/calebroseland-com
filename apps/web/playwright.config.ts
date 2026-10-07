import { defineConfig, devices } from '@playwright/test';
import { scratchContentDir } from './e2e/scratch-content.ts';

/** Specs that mutate the shared content directory, and so cannot run beside anything else. */
const WRITES_FILES = /editor-local\.spec\.ts/;

/* Not the dev server's port. Reusing a server someone already has running would point the specs that
   write files at the repository's content/ instead of the scratch copy. */
const port = 5199;

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/smoke/**'],
  fullyParallel: true,
  // Four projects share one dev server, and the emulated phone is the slowest of them. The default
  // 30s is tight enough under that contention to fail a test that is only slow, not broken.
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    // The scratch copy is made here, before Vite starts (see e2e/scratch-content.ts).
    command: `node e2e/scratch-content.ts && npm run dev -- --port ${port} --strictPort`,
    env: {
      // Backends that write files do so here, never in the repository's content/.
      CRC_CONTENT_DIR: scratchContentDir,
      // The suite covers the experimental GitHub editing too, so the Worker gets its flag from here.
      CLOUDFLARE_INCLUDE_PROCESS_ENV: 'true',
      FEATURE_GITHUB_EDITING: 'on',
    },
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: WRITES_FILES },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: WRITES_FILES },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testIgnore: WRITES_FILES },
    {
      // Working-tree mode writes real files on the one dev server every project shares, so it runs
      // after the others rather than beside them, and in a single browser: the editor it drives is
      // the same one the other projects already cover on all three.
      name: 'working-tree',
      testMatch: WRITES_FILES,
      dependencies: ['chromium', 'webkit', 'mobile'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
