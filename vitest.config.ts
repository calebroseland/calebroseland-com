import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { content } from "./apps/web/vite/content.ts";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  // Makes virtual:content/* resolvable in unit and dom tests; individual tests vi.mock them for fixtures.
  plugins: [content({ root, includeDrafts: true })],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: [
            "packages/**/*.test.ts",
            "apps/web/src/**/*.test.ts",
            "apps/web/vite/**/*.test.ts",
          ],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          include: ["packages/**/*.test.tsx", "apps/web/src/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["./vitest.setup.dom.ts"],
        },
      },
      "./apps/web/vitest.worker.config.ts",
    ],
    setupFiles: ["./vitest.setup.ts"],
    env: { TZ: "UTC", LANG: "en-US" },
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["packages/*/src/**", "apps/web/src/**", "apps/web/worker/**"],
      exclude: ["**/*.test.*", "**/routeTree.gen.ts", "**/*.d.ts"],
      thresholds: {
        "packages/*/src/**": { branches: 85, lines: 85 },
        "apps/web/worker/**": { branches: 85, lines: 85 },
        "apps/web/src/**": { branches: 60, lines: 60 },
      },
    },
  },
});
