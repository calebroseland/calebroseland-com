# Runbook

Operational procedures for calebroseland.com.

## Environments

| Env | URL | Deployed by |
|---|---|---|
| local | `http://localhost:5173` | `mise run dev` |
| preview | a `workers.dev` URL, shown as the PR's deployment | `preview` label on a pull request |
| production | `https://calebroseland.com` | push to `master` |
| backup | `https://calebroseland.dev` | every deploy, GitHub Pages (custom domain), static only |

`GET /api/health` returns the deployed commit sha, the environment name, and the time. It is the fastest way to tell which build is live.

## Previews

Add the `preview` label to a pull request. Once `check` and `build` pass, CI deploys that build as a Worker Preview named `pr-<number>` on `workers.dev`, smoke-tests it, and reports it as the PR's `pr-<number>-preview` deployment (View deployment). Each later push redeploys it. Removing the label or closing the PR deletes the Preview. Previews are public, sent with `noindex`, and report `preview` from `/api/health`.

## A bad deploy

1. Confirm what is live: `curl -s https://calebroseland.com/api/health`.
2. Revert the offending commit on `master` by pull request and let the deploy workflow publish, so the repository and production never disagree.
3. If the deploy's smoke check fails, the workflow already rolled production back to the previous version and opened or commented on the issue labelled `deploy-rollback`. Revert or fix on `master` before the next merge redeploys the bad commit.

## Rollback

- In an emergency, when a revert can't wait for CI: `npx wrangler rollback --name calebroseland-com --message "<why>"` from `apps/web` returns production to the previous version. Revert on `master` afterwards.
- In a Workers or Cloudflare outage: link people to the GitHub Pages backup at `calebroseland.dev` (the old `github.io` address redirects there). It shares no runtime with Cloudflare, and no DNS while the `.dev` zone is hosted elsewhere, and every deploy publishes and smoke-tests it. Pointing the apex at Pages is possible but takes about ten minutes for a certificate.

## The old site's service worker

The previous Vue site registered a Workbox service worker at `/service-worker.js` that serves `/` from its own cache, so a returning visitor can still see the old site after a deploy. `apps/web/public/service-worker.js` sits at that URL: the visitor's browser fetches it on its next update check, and it deletes the old caches, unregisters itself, and reloads open tabs into the current site. The app also unregisters the old worker when one of its own pages loads first (`src/legacyServiceWorker.ts`). Never delete or rename the file: without it the update check gets the HTML shell, fails, and the old worker stays for good. The smoke test checks it is served as JavaScript.

For one stuck device: open the site, reload once. If it still shows the old site, clear the site's data in the browser settings.

## Reading errors

- Worker errors: `npx wrangler tail` from `apps/web`, or the Workers Logs tab. All errors are structured JSON carrying a `requestId`.
- Client errors: sampled at ten percent and posted to `/api/log`, which logs them with `"event":"client.error"`. No personal data is collected and no cookie is set.
- The scheduled uptime probe opens or comments on a single GitHub issue labelled `uptime`.

## Secrets

The Worker has none. Local Worker vars live in `apps/web/.dev.vars`, which is git-ignored; `apps/web/.dev.vars.example` documents them. No `VITE_`-prefixed variable may ever hold a credential, because those are inlined into the client bundle.

`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are GitHub environment secrets, in `production` (deploys from `master` only) and `preview` (the preview and teardown jobs). There are no repository-level copies.
