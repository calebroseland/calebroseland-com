import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

/* Every story runs as a test in Chromium: it must render, and pass axe (preview.tsx sets a11y to fail
   on violations). Kept apart from the root projects, so `mise run check` stays fast. */
export default defineConfig({
  plugins: [storybookTest({ configDir: fileURLToPath(new URL('.storybook', import.meta.url)) })],
  // Bundled up front: a dependency found mid-run makes Vite reload the browser and fail the stories
  // that were running.
  optimizeDeps: {
    include: [
      '@base-ui/react/alert-dialog',
      '@base-ui/react/menu',
      '@base-ui/react/tooltip',
      '@tanstack/react-store',
      '@tanstack/store',
      'motion',
      'motion/mini',
      'motion/react',
      'react',
      'react-dom',
      'storybook/test',
    ],
  },
  test: {
    name: 'stories',
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
});
