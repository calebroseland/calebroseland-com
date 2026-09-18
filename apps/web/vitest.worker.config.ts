import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

/* Runs worker/**.test.ts inside workerd with the real wrangler config, so the handler under test is production code. */
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: { bindings: { ENVIRONMENT: "test" } },
    }),
  ],
  test: {
    name: "worker",
    include: ["worker/**/*.test.ts"],
  },
});
