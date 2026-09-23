# Agent context — calebroseland-com

Personal site + git-backed editor. React 19 SPA on a Cloudflare Worker; GitHub is the content store. Spec and plan live outside this repo (owner's artifacts folder); this file records what an agent needs to work here.

## Commands (mise is the only entry point)

| Task | What |
|---|---|
| `mise install && mise run setup` | Toolchain (Node 24), deps, git hooks, Playwright browsers |
| `mise run dev` | SPA + Worker in workerd with HMR at http://localhost:5173 |
| `mise run check` | Biome lint/format, `tsc -b`, Vitest (unit, dom, worker). Pre-commit hook and CI gate |
| `mise run test:e2e` | Playwright (Chromium, WebKit, mobile) against the dev server |
| `mise run build` / `build:pages` | Production build / GitHub Pages backup variant |
| `mise run size` · `mise run knip` | Bundle budgets · dead code and deps |
| `mise run smoke` | Post-deploy checks; needs `BASE_URL` |

Never run `npm run`, `npx vitest`, or `tsc` directly in docs or CI when a mise task exists.

## Layout

- `apps/web` — the one deployable. `src/routes` (TanStack file routes; `routeTree.gen.ts` is generated), `src/components`, `src/theme`, `worker/` (Cloudflare Worker: `/api/*` only, everything else is static assets), `vite/` (build plugins), `e2e/`.
- `packages/ui` — design system: tokens (`src/tokens`), base CSS, layout primitives (Stack, Cluster, Grid, Center), `Icon`, icon barrel (`icons.ts`, the only `@mdi/js` import), motion tokens.
- `packages/content-schema` — Zod schemas for everything in `content/`.
- `content/` — data the site renders. `placeholder: true` marks scaffolding copy.

## Conventions

- TypeScript strict + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. Relative imports carry `.ts`/`.tsx`.
- CSS Modules, every module wrapped in `@layer components`; semantic tokens only (`var(--color-text-muted)`), never primitives; logical properties; one level of nesting.
- State: URL (Router) → server (Query) → form (Form) → client (Store). Challenge any new `useState`/store field against that order.
- Motion: `m` inside `LazyMotion strict`; reduced motion is honoured twice (CSS tokens + `MotionConfig`).
- Tests colocated as `*.test.ts(x)`; RTL queries by role; unexpected `console.error`/`warn` fails a test. Worker tests run in workerd.
- Commits: Conventional Commits with workspace scope (`feat(web):`, `chore(ui):`, `ci:`). Squash-merge. Never push without the owner's go.
- Editor backends, offered by the login page in dev (and whenever OAuth is unconfigured):
  - **Working tree** edits the real files in `content/` on the branch you have checked out, through dev-server routes under `/@local/`. There are no branches or pull requests: the edit is an unstaged change you commit yourself, beside any code change. Images and other binaries stream to disk as bytes (`POST /@local/upload`), never as base64. A file changed outside the browser between load and save is detected and the save is refused.
  - **Fake GitHub** simulates branches, pull requests and merges in memory (persisted to `localStorage`), and a merge writes the result into `content/` so the loop ends at a rendered page.
  - **Pasted token** uses real GitHub through Octokit.
- `CRC_CONTENT_DIR` points the content pipeline and the local store at another directory; the E2E suite uses it so tests never write into the repository's own `content/`.
- Secrets: `apps/web/.dev.vars` (git-ignored) locally, `wrangler secret put` remotely. No `VITE_` variable may hold a credential.

## Operations

`docs/runbook.md` covers cutover, rollback, a bad deploy, and where errors surface.

## Environments

| Env | URL | From |
|---|---|---|
| local | http://localhost:5173 | `mise run dev` |
| staging | https://next.calebroseland.com | push to `next` |
| production | https://calebroseland.com | push to `master` (after cutover) |
| backup | https://calebroseland.github.io/calebroseland-com/ | every deploy, GitHub Pages, static only |
