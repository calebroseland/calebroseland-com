import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

/* Runs worker/**.test.ts inside workerd with the real wrangler config, so the handler under test is production code. */
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          ENVIRONMENT: 'test',
          ALLOWED_ORIGINS: 'https://example.com',
        },
        outboundService: () => new Response('blocked', { status: 502 }),
      },
    }),
  ],
  test: {
    name: 'worker',
    include: ['worker/**/*.test.ts'],
  },
});
