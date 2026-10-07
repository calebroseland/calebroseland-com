import { describe, expect, it } from 'vitest';
import { afterSignIn } from './login.ts';

describe('afterSignIn', () => {
  it('returns to the page the sign-in started from', () => {
    expect(afterSignIn('/posts/hello?x=1')).toBe('/posts/hello?x=1');
    expect(afterSignIn('/')).toBe('/');
    expect(afterSignIn('/editor/about')).toBe('/editor/about');
  });
  it('goes to the editor from nowhere, from a sign-in page, or from another site', () => {
    expect(afterSignIn(undefined)).toBe('/editor');
    expect(afterSignIn('/login?returnTo=/')).toBe('/editor');
    expect(afterSignIn('/login/callback')).toBe('/editor');
    expect(afterSignIn('//evil.test/x')).toBe('/editor');
    expect(afterSignIn('/\\evil.test')).toBe('/editor');
    expect(afterSignIn('https://evil.test')).toBe('/editor');
  });
});
