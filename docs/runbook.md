# Runbook

Operational procedures for calebroseland.com. Mirrors the cutover and rollback sections of the migration spec; this copy is the one to follow during an incident.

## Environments

| Env | URL | Deployed by |
|---|---|---|
| local | `http://localhost:5173` | `mise run dev` |
| staging | `https://next.calebroseland.com` | push to `next`, or `workflow_dispatch` |
| production | `https://calebroseland.com` | push to `master` |
| backup | `https://calebroseland.github.io/calebroseland-com/` | every deploy, GitHub Pages, static only |

`GET /api/health` returns the deployed commit sha, the environment name, and the time. It is the fastest way to tell which build is live.

## Cutover to Cloudflare

Preconditions: the rollback below has been rehearsed on staging and timed; staging passes its checks; Netlify is locked to its current deploy; the Cloudflare zone has been active for at least 48 hours with every record verified against the export taken from Google Cloud DNS.

1. Set the apex record's TTL to 300 seconds at least an hour ahead, so a rollback propagates quickly.
2. Merge `next` into `master` by pull request. The deploy workflow publishes the production Worker, still reachable only on its `workers.dev` hostname.
3. Add the apex custom domain to the production environment in `apps/web/wrangler.jsonc` and deploy. Cloudflare replaces the apex `A` record with the Worker binding.
4. Verify, in this order:
   - `curl -sI https://calebroseland.com` shows Cloudflare headers and preserves HSTS.
   - `curl -s https://calebroseland.com/api/health` returns the sha that was just merged.
   - `dig +short calebroseland.com TXT` still returns the Mailgun SPF record.
   - `BASE_URL=https://calebroseland.com mise run smoke` passes.
   - Sign in at `/login` and load `/editor`.
5. Soak for one week. Leave the Netlify site locked and intact for the whole soak.
6. Decommission only after three consecutive green backup deploys: delete the Netlify site, delete `develop` and `feature/ci-build`, and remove any unused OAuth callback.

## Rollback

Valid until the Netlify site is deleted at step 6 above.

1. Remove the apex custom domain from the production environment and deploy.
2. Recreate `A calebroseland.com → 104.198.14.52` in Cloudflare, DNS only, grey cloud.
3. Recovery is bound by the apex TTL, which is why step 1 of the cutover lowers it first.

After Netlify is gone, the standing fallback is the GitHub Pages backup, which shares no runtime or DNS with Cloudflare. It is always live and smoke-tested on every deploy. In a Workers outage, link people to the `github.io` URL; pointing the apex at Pages is possible but takes about ten minutes for a certificate.

## A bad deploy

1. Confirm what is live: `curl -s https://calebroseland.com/api/health`.
2. Revert the offending commit on `master` by pull request and let the deploy workflow publish. Prefer a revert over a manual `wrangler rollback`, so the repository and production never disagree.
3. If the site is down rather than wrong, follow the rollback above instead.

## Reading errors

- Worker errors: `npx wrangler tail` from `apps/web`, or the Workers Logs tab. All errors are structured JSON carrying a `requestId`.
- Client errors: sampled at ten percent and posted to `/api/log`, which logs them with `"event":"client.error"`. No personal data is collected and no cookie is set.
- The scheduled uptime probe opens or comments on a single GitHub issue labelled `uptime`.

## Secrets

Set per environment and never committed:

```bash
npx wrangler secret put GITHUB_CLIENT_SECRET            # production
npx wrangler secret put GITHUB_CLIENT_SECRET --env staging
```

Locally they live in `apps/web/.dev.vars`, which is git-ignored. `apps/web/.dev.vars.example` documents the names. No `VITE_`-prefixed variable may ever hold a credential, because those are inlined into the client bundle.
