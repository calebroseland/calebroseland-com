import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { content } from "./vite/content.ts";

const isPages = process.env.VITE_TARGET === "pages";
const base = process.env.VITE_BASE ?? "/";
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

/* Two build targets from one config:
   - default: SPA + Worker via the Cloudflare plugin (production, staging, local dev)
   - pages:   SPA only, path-prefixed, for the GitHub Pages backup. No Worker. */
export default defineConfig({
  base,
  define: {
    __BUILD_SHA__: JSON.stringify(process.env.GITHUB_SHA ?? "dev"),
    __API_ORIGIN__: JSON.stringify(process.env.VITE_API_ORIGIN ?? ""),
  },
  plugins: [
    content({ root: repoRoot }),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "src/routes",
      generatedRouteTree: "src/routeTree.gen.ts",
    }),
    react(),
    ...(isPages ? [] : [cloudflare()]),
  ],
  server: { port: 5173, strictPort: true },
  build: {
    sourcemap: true,
  },
});
