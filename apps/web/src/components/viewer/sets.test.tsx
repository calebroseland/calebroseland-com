import { describe, expect, it } from 'vitest';
import { findSet, formatView, locate, parseView } from './sets.ts';

const figure = (src: string, alt: string, size = 'width="800" height="600"') =>
  `<figure class="media"><a class="zoom" href="${src}"><img src="${src}" alt="${alt}" ${size}></a></figure>`;

const body = (): HTMLElement => {
  const el = document.createElement('div');
  el.innerHTML = [
    figure('/a.png', 'A'),
    `<figure class="gallery"><ul class="gallery-track"><li>${figure('/b.png', 'B')}</li><li>${figure('/c.svg', 'C')}</li></ul></figure>`,
    '<p>Text <img src="/inline.png" alt="inline"></p>',
    figure('https://cdn.example.com/d.jpg', '', ''),
  ].join('');
  return el;
};

describe('viewer sets', () => {
  it('reads and writes the view param', () => {
    expect(parseView('g2.3')).toEqual({ set: 'g2', index: 2 });
    expect(parseView('s1.1')).toEqual({ set: 's1', index: 0 });
    expect(parseView('nonsense')).toBeNull();
    expect(parseView('g1.0')).toBeNull();
    expect(formatView({ set: 'g2', index: 2 })).toBe('g2.3');
  });

  it('makes each gallery one set, and each lone image a set of one', () => {
    const root = body();
    expect(findSet(root, 'g1')?.items.map((i) => i.alt)).toEqual(['B', 'C']);
    expect(findSet(root, 's1')?.items.map((i) => i.alt)).toEqual(['A']);
    expect(findSet(root, 's2')?.items.map((i) => i.src)).toEqual(['https://cdn.example.com/d.jpg']);
    expect(findSet(root, 's3')).toBeNull();
  });

  it('describes each image for the viewer', () => {
    const [b, c] = findSet(body(), 'g1')?.items ?? [];
    expect(b).toMatchObject({
      kind: 'image',
      src: '/b.png',
      width: 800,
      height: 600,
      vector: false,
    });
    expect(c?.vector).toBe(true);
    expect(findSet(body(), 's2')?.items[0]).toMatchObject({ width: null, height: null });
  });

  it('finds where a clicked link sits', () => {
    const root = body();
    const links = [...root.querySelectorAll<HTMLAnchorElement>('a.zoom')];
    expect(links.map((a) => locate(root, a))).toEqual([
      { set: 's1', index: 0 },
      { set: 'g1', index: 0 },
      { set: 'g1', index: 1 },
      { set: 's2', index: 0 },
    ]);
  });
});
