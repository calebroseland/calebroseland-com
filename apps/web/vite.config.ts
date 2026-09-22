import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { content } from "./vite/content.ts";
import { localStore } from "./vite/local-store.ts";

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
    content({ root: repoRoot, siteOrigin: process.env.SITE_ORIGIN ?? "https://calebroseland.com" }),
    localStore({ root: repoRoot }),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "src/routes",
      generatedRouteTree: "src/routeTree.gen.ts",
      // Tests sit beside the routes they cover; they are not routes.
      routeFileIgnorePattern: "\\.(test|spec)\\.[jt]sx?$",
    }),
    react(),
    ...(isPages ? [] : [cloudflare()]),
  ],
  server: {
    port: 5173,
    strictPort: true,
    // Transform every route and studio module at startup so dependency discovery finishes before the first request.
    warmup: { clientFiles: ["./src/main.tsx", "./src/routes/**/*.tsx", "./src/studio/**/*.tsx"] },
  },
  // Studio routes are lazy; pre-bundle their deps so the first visit in dev does not trigger a re-optimize reload.
  optimizeDeps: {
    include: [
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/markdown",
      "@tiptap/extension-image",
      "@tiptap/extension-placeholder",
      "@base-ui/react/alert-dialog",
      "@base-ui/react/dialog",
      "@base-ui/react/menu",
      "@tanstack/react-form",
      "@tanstack/react-query",
      "@atlaskit/pragmatic-drag-and-drop/element/adapter",
      "@atlaskit/pragmatic-drag-and-drop/combine",
      "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge",
      "@octokit/core",
      "@octokit/plugin-rest-endpoint-methods",
      "yaml",
      "zod",
      "zod/mini",
    ],
  },
  build: {
    sourcemap: true,
  },
});
