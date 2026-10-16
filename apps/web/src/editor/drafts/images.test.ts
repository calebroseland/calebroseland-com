import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Buffer } from './buffer.ts';
import { preview } from './images.ts';

// A real 64 × 40 PNG, so its size can be read from the bytes.
const hero = readFileSync(
  new URL('../../../fixtures/content/posts/2026/09-18-hello-placeholder/hero.png', import.meta.url),
).toString('base64');

const buffer = {
  dir: 'posts/2026/09-18-hello',
  assets: [{ name: 'new.webp', objectUrl: 'blob:pending', width: 800, height: 600 }],
} as unknown as Buffer;
const files = [
  {
    path: 'posts/2026/09-18-hello/index.md',
    content: '# Hi',
    sha: 'a',
    encoding: 'utf-8' as const,
  },
  {
    path: 'posts/2026/09-18-hello/hero.png',
    content: hero,
    sha: 'b',
    encoding: 'base64' as const,
  },
];

const broken = [
  {
    path: 'posts/2026/09-18-hello/broken.png',
    content: 'eA==',
    sha: 'c',
    encoding: 'base64' as const,
  },
];

describe('preview', () => {
  it('shows a pending image from its object URL', () => {
    expect(preview('new.webp', buffer, files)).toEqual({
      src: 'blob:pending',
      size: { width: 800, height: 600 },
    });
  });

  it('shows an image on the branch from the loaded bundle, with or without ./', () => {
    expect(preview('hero.png', buffer, files).src).toBe(`data:image/png;base64,${hero}`);
    expect(preview('./hero.png', buffer, files).src).toBe(`data:image/png;base64,${hero}`);
  });

  it('leaves absolute, remote and unknown sources as written', () => {
    for (const src of ['https://x.test/a.png', '/a.png', 'data:image/png;base64,x', 'gone.png']) {
      expect(preview(src, buffer, files)).toEqual({ src });
    }
  });

  it('gives the size of an image it can read, so its space is held before it loads', () => {
    expect(preview('hero.png', buffer, files).size).toEqual({ width: 64, height: 40 });
    expect(preview('broken.png', buffer, broken)).toEqual({ src: 'data:image/png;base64,eA==' });
  });
});
