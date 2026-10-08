/* What the viewer shows, read from the rendered body: each gallery is a set, and each lone image a
   set of one. Items carry a kind so other kinds (code, documents) can join the same viewer later. */

type ImageItem = {
  kind: 'image';
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
  vector: boolean;
  /** The link in the body the image opens from, and closes back into. */
  source: HTMLAnchorElement;
};

export type ViewerItem = ImageItem;

export type ViewerSet = { id: string; items: ViewerItem[] };

/** A position in the body's sets; `index` counts from 0, the URL from 1. */
export type ViewTarget = { set: string; index: number };

export const parseView = (param: string | undefined): ViewTarget | null => {
  const m = param?.match(/^([gs][1-9]\d*)\.([1-9]\d*)$/);
  return m?.[1] && m[2] ? { set: m[1], index: Number(m[2]) - 1 } : null;
};

export const formatView = (t: ViewTarget): string => `${t.set}.${t.index + 1}`;

const dimension = (img: HTMLImageElement | null, name: 'width' | 'height'): number | null => {
  const n = Number(img?.getAttribute(name));
  return n > 0 ? n : null;
};

const imageItem = (source: HTMLAnchorElement): ImageItem => {
  const img = source.querySelector('img');
  const src = source.getAttribute('href') ?? '';
  return {
    kind: 'image',
    src,
    alt: img?.getAttribute('alt') ?? '',
    width: dimension(img, 'width'),
    height: dimension(img, 'height'),
    vector: /\.svg(?:[?#]|$)/i.test(src),
    source,
  };
};

const links = (el: Element) => [...el.querySelectorAll<HTMLAnchorElement>('a.zoom')];

const allSets = (root: HTMLElement): ViewerSet[] => {
  const galleries = [...root.querySelectorAll('figure.gallery')];
  const singles = [...root.querySelectorAll('figure.media')].filter((f) => !f.closest('.gallery'));
  return [
    ...galleries.map((g, i) => ({ id: `g${i + 1}`, items: links(g).map(imageItem) })),
    ...singles.map((f, i) => ({ id: `s${i + 1}`, items: links(f).map(imageItem) })),
  ];
};

export const findSet = (root: HTMLElement, id: string): ViewerSet | null =>
  allSets(root).find((s) => s.id === id) ?? null;

/** The set and position of a link the reader activated. */
export const locate = (root: HTMLElement, link: HTMLAnchorElement): ViewTarget | null => {
  for (const s of allSets(root)) {
    const index = s.items.findIndex((item) => item.source === link);
    if (index >= 0) {
      return { set: s.id, index };
    }
  }
  return null;
};
