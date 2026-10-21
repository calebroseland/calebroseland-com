import { describe, expect, it } from 'vitest';
import {
  type Buffer,
  type BufferAsset,
  createBufferStore,
  missingAlt,
  readLocalBuffer,
  writeLocalBuffer,
} from './buffer.ts';

const asset = (name: string): BufferAsset => ({
  name,
  type: 'image/jpeg',
  blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }),
  objectUrl: `blob:${name}`,
  alt: '',
  width: 1,
  height: 1,
});

const base: Buffer = {
  dir: 'content/posts/2026/09-18-x',
  baseHeadSha: 'abc',
  markdown: '# x',
  meta: {
    kind: 'post',
    title: 'X',
    slug: 'x',
    date: '2026-09-18',
    draft: true,
    tags: [],
  },
  assets: [],
  existingAssets: [],
  dirty: false,
  restoredFromLocal: false,
  imagesDropped: false,
  updatedAt: '2026-09-18T00:00:00.000Z',
};

const mem = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    m,
  };
};

describe('buffer store', () => {
  it('marks dirty on edits and clean on save, moving new assets to existing', () => {
    const b = createBufferStore(base);
    b.setMarkdown('# y');
    b.addAsset(asset('a.jpg'));
    expect(b.store.state.dirty).toBe(true);
    expect(missingAlt(b.store.state).map((a) => a.name)).toEqual(['a.jpg']);
    b.setAlt('a.jpg', 'An image');
    expect(missingAlt(b.store.state)).toEqual([]);
    b.markSaved('def');
    expect(b.store.state).toMatchObject({
      dirty: false,
      baseHeadSha: 'def',
      assets: [],
      existingAssets: ['a.jpg'],
    });
  });

  it('does not dirty on a no-op markdown set', () => {
    const b = createBufferStore(base);
    b.setMarkdown('# x');
    expect(b.store.state.dirty).toBe(false);
  });

  it("keeps each entry's unsaved copy apart, though every one is on the same working tree", () => {
    const storage = mem();
    const a = createBufferStore(base);
    const b = createBufferStore({ ...base, dir: 'content/pages/about', markdown: '# about' });
    a.setMarkdown('# a, edited');
    b.setMarkdown('# about, edited');
    writeLocalBuffer(a.store.state, storage);
    writeLocalBuffer(b.store.state, storage);
    expect(readLocalBuffer(base.dir, storage)?.markdown).toBe('# a, edited');
    expect(readLocalBuffer('content/pages/about', storage)?.markdown).toBe('# about, edited');
  });

  it('persists only while dirty and restores with the restored flag', () => {
    const storage = mem();
    const b = createBufferStore(base);
    writeLocalBuffer(b.store.state, storage);
    expect(storage.m.size).toBe(0);
    b.setMarkdown('# edited');
    writeLocalBuffer(b.store.state, storage);
    expect(readLocalBuffer(base.dir, storage)).toMatchObject({
      markdown: '# edited',
      restoredFromLocal: true,
    });
    b.markSaved('def');
    writeLocalBuffer(b.store.state, storage);
    expect(readLocalBuffer(base.dir, storage)).toBeNull();
  });

  it('keeps only the text locally, and says so when a restored copy had images', () => {
    const storage = mem();
    const b = createBufferStore(base);
    b.setMarkdown('# with an image');
    b.addAsset(asset('a.jpg'));
    writeLocalBuffer(b.store.state, storage);

    // A Blob cannot go into local storage, and serialising it would cost the text its place there.
    expect(storage.m.get(`crc:buffer:${base.dir}`)).not.toContain('blob');
    const restored = readLocalBuffer(base.dir, storage);
    expect(restored).toMatchObject({
      markdown: '# with an image',
      assets: [],
      imagesDropped: true,
    });
  });
});
