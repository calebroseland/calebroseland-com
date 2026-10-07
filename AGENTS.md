# Agent context — calebroseland-com

Personal site + git-backed editor. React 19 SPA on a Cloudflare Worker; GitHub is the content store. Spec, plan and design notes live in `.fieldkit/20260918-site-and-editor/` (git-excluded, on the owner's machine); this file records what an agent needs to work here.

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
- `packages/ui` — design system: tokens (`src/tokens`), base CSS, layout primitives (Stack, Cluster, Grid, Center), `Icon`, icon registry (`icons.ts`: the only import of icon data, Lucide and Simple Icons through Iconify, named `lucide:…` / `simple-icons:…` in code and content), motion tokens.
- `packages/content-schema` — Zod schemas for everything in `content/`.
- `content/` — data the site renders.

## Conventions

- TypeScript strict + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. Relative imports carry `.ts`/`.tsx`.
- Style (Biome enforces it; `mise run format` fixes most): single quotes in TS, double in JSX; semicolons; 100 columns; operators lead wrapped lines; braces on every block; no nested ternaries; arrow constants for named functions (`const thing = () => {…}`); `type` over `interface` except module augmentation; named exports only (config files, `.d.ts` declarations and the Worker entry excepted); `T[]` for plain element types and `Array<…>` otherwise; exported functions state their return type, except components, hooks, and query/mutation option factories; CSS properties ordered outside-in. Custom rules live in `tools/biome/*.grit`, each with fixtures under `tools/biome/fixtures/` checked by `tools/biome/rules.test.ts`.
- CSS Modules, every module wrapped in `@layer components`; semantic tokens only (`var(--color-text-muted)`), never primitives; logical properties; one level of nesting.
- State: URL (Router) → server (Query) → form (Form) → client (Store). Challenge any new `useState`/store field against that order.
- Motion: `m` inside `LazyMotion strict`; reduced motion is honoured twice (CSS tokens + `MotionConfig`).
- Components call only purpose-named custom hooks; built-in and library hooks (`useState`, `useQuery`, `useNavigate`, `Route.useSearch`, `useId`, …) are called inside those hooks. Data hooks (`src/editor/data/hooks.ts`) return views to switch on and commands whose runs resolve to typed outcomes; toasts, copy and navigation stay in the component. `tools/biome/no-direct-hooks.grit` enforces this for every component in `apps/web/src` and `packages/*/src` outside tests: a library hook is any `use…` imported (named or default) from a third-party package (the workspace's `@crc/*` hooks count as purpose-named) or a `use…` method such as `Route.useSearch`.
- Tests colocated as `*.test.ts(x)`; RTL queries by role; unexpected `console.error`/`warn` fails a test. Worker tests run in workerd.
- Commits: Conventional Commits with workspace scope (`feat(web):`, `chore(ui):`, `ci:`). Squash-merge. Never push without the owner's go.
- Editor backends. The working tree is the editor for now; everything through GitHub is experimental and off unless the Worker var `FEATURE_GITHUB_EDITING` is `"on"`. The login page and the account menu offer only what the environment has, and a built site with the flag off offers no sign-in at all:
  - **Working tree** edits the real files in `content/` on the branch you have checked out, through dev-server routes under `/@local/`. There are no branches or pull requests: the edit is an unstaged change you commit yourself, beside any code change. Images and other binaries stream to disk as bytes (`POST /@local/upload`), never as base64. A file changed outside the browser between load and save is detected and the save is refused.
  - **Fake GitHub** (flag) simulates branches, pull requests and merges in memory (persisted to `localStorage`), starting in dev from a copy of `content/`.
  - **Pasted token** and **GitHub OAuth** (flag) use real GitHub through Octokit; OAuth also needs the OAuth app configured.
- Feature flags are Worker vars: per environment in `wrangler.jsonc`, locally in `apps/web/.dev.vars`; the SPA reads them at runtime from `/api/auth/config`, never from `VITE_*`. The E2E dev server turns `FEATURE_GITHUB_EDITING` on through its process env.
- The editor branches from and publishes into `CONTENT_BRANCH`, fixed at build time: `master` by default, `next` for the staging build.
- Editor data lives in `src/editor/data`: query keys, query options, and mutation options that declare what they make stale. One lazily created query client serves every editing surface, refreshes those queries after a write, and ends the session on a rejected token. Screens ask the backend's capabilities (`useCapabilities`), never its kind.
- Tests never read the live `content/`: unit tests and the E2E suite use the fixed fixture in `apps/web/fixtures/content` (E2E on a fresh copy, through `CRC_CONTENT_DIR`). Change the fixture when a test needs different content.
- Secrets: `apps/web/.dev.vars` (git-ignored) locally, `wrangler secret put` remotely. No `VITE_` variable may hold a credential.

## Operations

`docs/runbook.md` covers cutover, rollback, a bad deploy, and where errors surface.

## Environments

| Env | URL | From |
|---|---|---|
| local | http://localhost:5173 | `mise run dev` |
| staging | https://next.calebroseland.com | push to `next` |
| production | https://calebroseland.com | push to `master` (after cutover) |
| backup | https://calebroseland.dev | every deploy, GitHub Pages, static only |
