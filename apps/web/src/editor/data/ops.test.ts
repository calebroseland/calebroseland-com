import { afterEach, describe, expect, it, vi } from 'vitest';
import { readLocalBuffer } from '../drafts/buffer.ts';
import { installFakeWorkingTree } from '../fakeWorkingTree.ts';
import { createEntry, deleteEntry } from './ops.ts';

const about = 'content/pages/about/index.md';
const aboutMd =
  '---\nkind: page\ntitle: About\nslug: about\ndate: 2026-01-01\ndraft: false\ntags: []\n---\n\nHello.\n';

const mem = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createEntry', () => {
  it('writes a new entry as a draft with an empty body', async () => {
    const disk = installFakeWorkingTree();
    const date = new Date('2026-10-21T00:00:00Z');
    await createEntry({ kind: 'post', title: 'Fresh', slug: 'fresh', date });
    expect(disk.read('content/posts/2026/10-21-fresh/index.md')).toContain('draft: true');
  });

  it('refuses a slug an entry already has, leaving that entry as it was', async () => {
    const disk = installFakeWorkingTree({ [about]: aboutMd });
    const date = new Date('2026-10-21T00:00:00Z');
    await expect(
      createEntry({ kind: 'page', title: 'About', slug: 'about', date }),
    ).rejects.toThrow(/already/);
    await expect(
      createEntry({ kind: 'post', title: 'About', slug: 'about', date }),
    ).rejects.toThrow(/already/);
    expect(disk.read(about)).toBe(aboutMd);
  });
});

describe('deleteEntry', () => {
  it('removes the files and the unsaved copy kept on this device', async () => {
    const disk = installFakeWorkingTree({ [about]: aboutMd });
    const storage = mem();
    storage.setItem(
      'crc:buffer:content/pages/about',
      JSON.stringify({ dir: 'content/pages/about', markdown: 'unsaved', baseHeadSha: 'h0' }),
    );
    await deleteEntry('content/pages/about', storage);
    expect(disk.read(about)).toBeUndefined();
    expect(readLocalBuffer('content/pages/about', storage)).toBeNull();
  });
});
