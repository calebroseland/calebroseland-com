# calebroseland.com

Source for [calebroseland.com](https://calebroseland.com): a React SPA served by a Cloudflare Worker, with content stored as markdown in this repository and (in progress) a browser editor that commits straight to it.

## Quick start

```bash
mise install && mise run setup
mise run dev
```

Requires [mise](https://mise.jdx.dev). Everything else (Node 24, wrangler, Playwright) is installed by the two commands above.

## Working here

- `mise run check` runs lint, typecheck, and tests. It is the pre-commit hook and the CI gate.
- `mise run test:e2e` runs Playwright against the local dev server.
- See `AGENTS.md` for layout, conventions, and environments; `content/README.md` for the content model.

## Status

Phase 1 of the rewrite: toolchain, design system v0, landing page. The previous Vue 2 site is preserved at tag `archive/vue2`.
