import { describe, expect, it } from 'vitest';
import { bufferFromBundle } from './load.ts';

const md =
  '---\nkind: post\ntitle: Hi\nslug: hi\ndate: 2026-09-18\ndraft: true\ntags: []\n---\n\n# Hi\n';

describe('bufferFromBundle', () => {
  it('builds a buffer with existing assets and the head sha', () => {
    const b = bufferFromBundle(
      {
        ref: 'drafts/hi',
        headSha: 'h1',
        files: [
          {
            path: 'content/posts/2026/09-18-hi/index.md',
            content: md,
            sha: 's',
            encoding: 'utf-8',
          },
          {
            path: 'content/posts/2026/09-18-hi/hero.jpg',
            content: '',
            sha: 's2',
            encoding: 'base64',
          },
        ],
      },
      'hi',
    );
    expect(b).toMatchObject({
      dir: 'content/posts/2026/09-18-hi',
      baseHeadSha: 'h1',
      markdown: '# Hi',
      existingAssets: ['hero.jpg'],
      dirty: false,
    });
    expect(b.meta.date).toBe('2026-09-18');
  });

  it('throws when the slug has no bundle', () => {
    expect(() => bufferFromBundle({ ref: 'drafts/x', headSha: 'h', files: [] }, 'x')).toThrow(
      /No bundle/,
    );
  });
});
