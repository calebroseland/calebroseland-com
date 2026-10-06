import { z } from 'zod';
import type { WorkerEnv } from './env.ts';
import { featureOn } from './features.ts';
import { problem } from './problem.ts';

/* GitHub requires the client secret at code redemption and sends no CORS headers, so the exchange
   happens here. The Worker never sees the user's password and never stores the token. */

const callbackBody = z.object({
  code: z.string().min(1).max(512),
  codeVerifier: z.string().min(43).max(128),
  redirectUri: z.url(),
});

const githubToken = z.object({
  access_token: z.string().min(1),
  token_type: z.string(),
  scope: z.string().optional().default(''),
  expires_in: z.number().optional(),
  refresh_token: z.string().optional(),
});

const githubError = z.object({ error: z.string(), error_description: z.string().optional() });

type AuthConfig = {
  /** Editing through GitHub is switched on here (FEATURE_GITHUB_EDITING). */
  github: boolean;
  /** GitHub is on and its OAuth app is configured, so the sign-in round trip can run. */
  oauth: boolean;
  clientId: string | null;
};

/** Tells the SPA which ways of signing in to offer in this environment. */
export function authConfig(env: WorkerEnv): Response {
  const github = featureOn(env.FEATURE_GITHUB_EDITING);
  const oauth = github && Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
  return Response.json(
    { github, oauth, clientId: oauth ? env.GITHUB_CLIENT_ID : null } satisfies AuthConfig,
    { headers: { 'cache-control': 'no-store' } },
  );
}

export async function authCallback(
  request: Request,
  env: WorkerEnv,
  requestId: string,
): Promise<Response> {
  if (!featureOn(env.FEATURE_GITHUB_EDITING)) {
    return problem(404, 'GitHub editing is off', 'FEATURE_GITHUB_EDITING is not on here.');
  }
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return problem(
      503,
      'Sign-in not configured',
      'GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are not set for this environment.',
    );
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return problem(400, 'Invalid JSON');
  }
  const parsed = callbackBody.safeParse(json);
  if (!parsed.success) {
    return problem(400, 'Invalid request body', undefined, {
      errors: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  const { code, codeVerifier, redirectUri } = parsed.data;

  const origin = env.GITHUB_OAUTH_ORIGIN ?? 'https://github.com';
  let upstream: Response;
  try {
    upstream = await fetch(`${origin}/login/oauth/access_token`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'user-agent': 'calebroseland-com-worker',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        requestId,
        event: 'auth.exchange.network',
        message: err instanceof Error ? err.message : String(err),
      }),
    );
    return problem(502, 'GitHub unreachable', 'The token exchange did not complete. Try again.');
  }

  const body: unknown = await upstream.json().catch(() => null);
  const ok = githubToken.safeParse(body);
  if (ok.success) {
    const t = ok.data;
    return Response.json(
      {
        accessToken: t.access_token,
        tokenType: t.token_type,
        scope: t.scope,
        ...(t.expires_in
          ? { expiresAt: new Date(Date.now() + t.expires_in * 1000).toISOString() }
          : {}),
        ...(t.refresh_token ? { refreshToken: t.refresh_token } : {}),
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  }
  const err = githubError.safeParse(body);
  // Never log the code, verifier, or any token; the error code from GitHub is enough to diagnose.
  console.error(
    JSON.stringify({
      requestId,
      event: 'auth.exchange.rejected',
      status: upstream.status,
      error: err.success ? err.data.error : 'unknown',
    }),
  );
  if (
    err.success
    && (err.data.error === 'bad_verification_code'
      || err.data.error === 'incorrect_client_credentials')
  ) {
    return problem(400, "Sign-in didn't complete", err.data.error_description ?? err.data.error, {
      code: err.data.error,
    });
  }
  return problem(
    502,
    'GitHub rejected the exchange',
    err.success ? err.data.error : `HTTP ${upstream.status}`,
  );
}
