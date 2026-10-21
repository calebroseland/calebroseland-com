import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const src = fileURLToPath(new URL('src', import.meta.url));

/* Every bare import in the package's sources and stories, bundled up front: a dependency Vite finds
   mid-run makes it reload the browser and fail the stories that were running. */
const bareImports = (): string[] => {
  const found = new Set<string>(['react', 'react-dom']);
  for (const name of readdirSync(src, { recursive: true, encoding: 'utf8' })) {
    if (!/\.tsx?$/.test(name) || /\.test\.tsx?$/.test(name)) {
      continue;
    }
    const code = readFileSync(`${src}/${name}`, 'utf8');
    for (const [, spec] of code.matchAll(/^import (?!type )[^'"]*'([^.'/][^']*)'/gm)) {
      if (spec && !spec.startsWith('@crc/') && !spec.startsWith('@storybook/')) {
        found.add(spec);
      }
    }
  }
  return [...found].sort();
};

/* Every story runs as a test in Chromium: it must render, and pass axe (preview.tsx sets a11y to fail
   on violations). Kept apart from the root projects, so `mise run check` stays fast. */
export default defineConfig({
  plugins: [storybookTest({ configDir: fileURLToPath(new URL('.storybook', import.meta.url)) })],
  optimizeDeps: { include: bareImports() },
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
