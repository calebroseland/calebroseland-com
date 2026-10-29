import { describe, expect, it } from 'vitest';
import { entriesFromTree } from './entries.ts';
import type { Tree } from './workingTree.ts';

const md = (kind: string, slug: string, title: string, date: string, draft = false) =>
  `---\nkind: ${kind}\ntitle: ${title}\nslug: ${slug}\ndate: ${date}\ndraft: ${draft}\ntags: []\n---\n\nbody\n`;

const tree: Tree = {
  headSha: 'h1',
  files: [
    {
      path: 'content/posts/2026/09-18-older/index.md',
      content: md('post', 'older', 'Older', '2026-09-18'),
      encoding: 'utf-8',
    },
    {
      path: 'content/posts/2026/09-19-newer/index.md',
      content: md('post', 'newer', 'Newer', '2026-09-19'),
      encoding: 'utf-8',
    },
    { path: 'content/posts/2026/09-19-newer/hero.png', content: '', encoding: 'base64' },
    {
      path: 'content/pages/about/index.md',
      content: md('page', 'about', 'About', '2026-01-01'),
      encoding: 'utf-8',
    },
    { path: 'content/profile.yaml', content: 'name: x', encoding: 'utf-8' },
    {
      path: 'content/posts/2026/09-20-broken/index.md',
      content: '---\nkind: post\nslug: BAD SLUG\n---\n',
      encoding: 'utf-8',
    },
  ],
};

describe('entriesFromTree', () => {
  it('reads posts and pages, newest first, ignoring assets and non-entries', () => {
    const entries = entriesFromTree(tree);
    expect(entries.map((e) => e.slug)).toEqual(['newer', 'older', 'about']);
    expect(entries[0]).toMatchObject({
      kind: 'post',
      title: 'Newer',
      dir: 'content/posts/2026/09-19-newer',
    });
    expect(entries.find((e) => e.slug === 'about')?.kind).toBe('page');
  });

  it('skips an entry with invalid frontmatter rather than failing the whole board', () => {
    expect(entriesFromTree(tree).some((e) => e.dir.endsWith('broken'))).toBe(false);
  });
});
