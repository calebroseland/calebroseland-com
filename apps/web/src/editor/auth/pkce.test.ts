import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { authorizeUrl, base64Url, createChallenge, createVerifier, randomString } from './pkce.ts';

describe('pkce', () => {
  it('produces verifiers of the RFC length using only unreserved characters', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 64, maxLength: 64 }), (seed) => {
        const v = createVerifier(() => seed);
        expect(v).toHaveLength(64);
        expect(v).toMatch(/^[A-Za-z0-9\-._~]+$/);
      }),
    );
  });

  it('is deterministic for a given random source', () => {
    const fixed = () => new Uint8Array(16).fill(7);
    expect(randomString(16, fixed)).toBe(randomString(16, fixed));
  });

  it('computes the RFC 7636 appendix B test vector', async () => {
    // https://www.rfc-editor.org/rfc/rfc7636#appendix-B
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    expect(await createChallenge(verifier)).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('base64url has no padding or unsafe characters', () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 64 }), (bytes) => {
        expect(base64Url(bytes)).toMatch(/^[A-Za-z0-9\-_]*$/);
      }),
    );
  });

  it('builds the authorize url with S256', () => {
    const u = new URL(
      authorizeUrl({
        clientId: 'id',
        redirectUri: 'https://x.test/cb',
        state: 's',
        challenge: 'c',
      }),
    );
    expect(u.origin + u.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(Object.fromEntries(u.searchParams)).toEqual({
      client_id: 'id',
      redirect_uri: 'https://x.test/cb',
      state: 's',
      code_challenge: 'c',
      code_challenge_method: 'S256',
    });
  });
});
