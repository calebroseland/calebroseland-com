import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bundleDirFor, findBundleDir, findEntryDir, slugify } from './paths.ts';

describe('bundleDirFor', () => {
  it('date-prefixes a post in UTC', () => {
    expect(bundleDirFor('post', new Date('2026-09-18T23:59:00Z'), 'hello')).toBe(
      'content/posts/2026/09-18-hello',
    );
  });

  it('gives a page a bare slug directory, since a page has no date in its path', () => {
    expect(bundleDirFor('page', new Date('2026-09-18T00:00:00Z'), 'about')).toBe(
      'content/pages/about',
    );
  });
});

describe('findBundleDir', () => {
  const paths = [
    'content/posts/2026/09-18-hello/index.md',
    'content/posts/2026/09-18-hello/hero.png',
    'content/posts/2026/09-19-hello-again/index.md',
    'content/pages/about/index.md',
    'content/pages/now/index.md',
  ];

  it('matches a post by its date-prefixed suffix', () => {
    expect(findBundleDir(paths, 'post', 'hello')).toBe('content/posts/2026/09-18-hello');
    expect(findBundleDir(paths, 'post', 'hello-again')).toBe(
      'content/posts/2026/09-19-hello-again',
    );
  });

  it("matches a page exactly, so 'now' never matches 'not-now'", () => {
    expect(findBundleDir([...paths, 'content/pages/not-now/index.md'], 'page', 'now')).toBe(
      'content/pages/now',
    );
  });

  it('does not cross kinds', () => {
    expect(findBundleDir(paths, 'page', 'hello')).toBeNull();
    expect(findBundleDir(paths, 'post', 'about')).toBeNull();
  });

  it('resolves a slug to whichever kind owns it', () => {
    expect(findEntryDir(paths, 'hello')).toEqual({
      kind: 'post',
      dir: 'content/posts/2026/09-18-hello',
    });
    expect(findEntryDir(paths, 'about')).toEqual({ kind: 'page', dir: 'content/pages/about' });
    expect(findEntryDir(paths, 'missing')).toBeNull();
  });
});

describe('slugify', () => {
  it('produces slugs the content schema accepts, idempotently', () => {
    const valid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 40 }), (s) => {
        const out = slugify(s);
        if (out.length > 0) {
          expect(out).toMatch(valid);
          expect(slugify(out)).toBe(out);
        }
      }),
    );
  });

  it('handles accents and punctuation', () => {
    expect(slugify("Héllo, Wörld!  It's  2026")).toBe('hello-world-it-s-2026');
  });
});
