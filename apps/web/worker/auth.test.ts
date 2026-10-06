import { env, SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { authCallback, authConfig } from './auth.ts';

/* The vitest worker config points GITHUB_OAUTH_ORIGIN at a Miniflare outbound stub (see vitest.worker.config.ts)
   so the exchange exercises the real handler against a scripted GitHub. */

const site = 'https://example.com';
const post = (body: unknown, origin = site) =>
  SELF.fetch(`${site}/api/auth/callback`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify(body),
  });
const valid = {
  code: 'good-code',
  codeVerifier: 'v'.repeat(43),
  redirectUri: `${site}/login/callback`,
};

describe('GET /api/auth/config', () => {
  it('reports GitHub on and OAuth configured, with the public client id only', async () => {
    const res = await SELF.fetch(`${site}/api/auth/config`);
    expect(await res.json()).toEqual({ github: true, oauth: true, clientId: env.GITHUB_CLIENT_ID });
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('offers nothing through GitHub while the flag is off, configured or not', async () => {
    const res = authConfig({ ...env, FEATURE_GITHUB_EDITING: 'off' });
    expect(await res.json()).toEqual({ github: false, oauth: false, clientId: null });
  });
});

describe('POST /api/auth/callback with GitHub editing off', () => {
  it('refuses the exchange', async () => {
    const req = new Request(`${site}/api/auth/callback`, {
      method: 'POST',
      body: JSON.stringify(valid),
    });
    const res = await authCallback(req, { ...env, FEATURE_GITHUB_EDITING: 'off' }, 'r');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/auth/callback', () => {
  it('exchanges a good code for a token and never echoes the secret', async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    const body = await res.json<Record<string, unknown>>();
    expect(body).toMatchObject({ accessToken: 'gho_test_token', tokenType: 'bearer' });
    expect(JSON.stringify(body)).not.toContain(env.GITHUB_CLIENT_SECRET);
    expect(res.headers.get('access-control-allow-origin')).toBe(site);
  });

  it('rejects an invalid body with field-level problem details', async () => {
    const res = await post({ code: '', codeVerifier: 'short', redirectUri: 'nope' });
    expect(res.status).toBe(400);
    const body = await res.json<{ errors: Array<{ path: string }> }>();
    expect(body.errors.map((e) => e.path).sort()).toEqual(['code', 'codeVerifier', 'redirectUri']);
  });

  it('rejects malformed JSON', async () => {
    const res = await SELF.fetch(`${site}/api/auth/callback`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    });
    expect(res.status).toBe(400);
  });

  it("maps a bad verification code to a 400 with GitHub's error code", async () => {
    const res = await post({ ...valid, code: 'bad-code' });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      title: "Sign-in didn't complete",
      code: 'bad_verification_code',
    });
  });

  it('maps an upstream failure to 502', async () => {
    const res = await post({ ...valid, code: 'explode' });
    expect(res.status).toBe(502);
  });

  it('denies cross-origin requests from unlisted origins', async () => {
    const res = await post(valid, 'https://evil.example');
    expect(res.status).toBe(403);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('answers preflight for allowed origins only', async () => {
    const ok = await SELF.fetch(`${site}/api/auth/callback`, {
      method: 'OPTIONS',
      headers: { origin: site },
    });
    expect(ok.status).toBe(204);
    expect(ok.headers.get('access-control-allow-methods')).toContain('POST');
    const no = await SELF.fetch(`${site}/api/auth/callback`, {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example' },
    });
    expect(no.status).toBe(403);
  });
});
