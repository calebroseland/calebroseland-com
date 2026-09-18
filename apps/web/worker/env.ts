/* Secrets and test-only vars are not in wrangler.jsonc, so `wrangler types` cannot see them.
   (A global `interface Env` augmentation does not merge under the TypeScript 7 compiler; an intersection does.) */
type Secrets = {
  /** Set with `wrangler secret put GITHUB_CLIENT_SECRET` per environment; `.dev.vars` locally. */
  GITHUB_CLIENT_SECRET?: string;
  /** Test hook: where the token exchange POSTs. Defaults to https://github.com. */
  GITHUB_OAUTH_ORIGIN?: string;
};

export type WorkerEnv = Env & Secrets;
