import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { entry } from './entry.ts';

const basePost = { kind: 'post', title: 'Hello', slug: 'hello-world', date: '2026-09-18' };

describe('entry', () => {
  it('parses a post and coerces the date', () => {
    const parsed = entry.parse(basePost);
    expect(parsed.kind).toBe('post');
    expect(parsed.date).toBeInstanceOf(Date);
    expect(parsed.draft).toBe(true);
  });

  it('discriminates on kind', () => {
    expect(entry.safeParse({ ...basePost, kind: 'gallery' }).success).toBe(false);
  });

  it.each(['Hello', 'hello--world', '-hello', 'hello-', 'hello world', 'héllo'])(
    'rejects slug %j',
    (slug) => {
      expect(entry.safeParse({ ...basePost, slug }).success).toBe(false);
    },
  );

  it('accepts any lowercase hyphenated slug', () => {
    const word = fc.stringMatching(/^[a-z0-9]{1,8}$/);
    fc.assert(
      fc.property(fc.array(word, { minLength: 1, maxLength: 5 }), (words) => {
        expect(entry.safeParse({ ...basePost, slug: words.join('-') }).success).toBe(true);
      }),
    );
  });
});
