import type { Element, ElementContent, Root } from 'hast';
import { SKIP, visit } from 'unist-util-visit';

const isImage = (n: ElementContent): n is Element => n.type === 'element' && n.tagName === 'img';

// Between images on adjacent lines sits a newline, or a hard break when a line ends in two spaces or `\`.
const isGap = (n: ElementContent): boolean =>
  (n.type === 'text' && n.value.trim() === '') || (n.type === 'element' && n.tagName === 'br');

/** The images of a paragraph that holds nothing else, or null. */
const imagesOnly = (p: Element): Element[] | null => {
  const images = p.children.filter(isImage);
  return images.length > 0 && p.children.every((c) => isImage(c) || isGap(c)) ? images : null;
};

const figure = (img: Element, n: number): Element => {
  const alt = typeof img.properties.alt === 'string' ? img.properties.alt.trim() : '';
  const src = String(img.properties.src ?? '');
  const link: Element = {
    type: 'element',
    tagName: 'a',
    properties: {
      className: ['zoom'],
      href: src,
      ariaLabel: alt ? `Open image: ${alt}` : `Open image ${n}`,
    },
    children: [img],
  };
  // The link already says the alt; the visible caption is for sighted readers only.
  const caption: Element = {
    type: 'element',
    tagName: 'figcaption',
    properties: { ariaHidden: 'true' },
    children: [{ type: 'text', value: alt }],
  };
  return {
    type: 'element',
    tagName: 'figure',
    properties: { className: ['media'] },
    children: alt ? [link, caption] : [link],
  };
};

const gallery = (figures: Element[]): Element => ({
  type: 'element',
  tagName: 'figure',
  properties: { className: ['gallery'], ariaLabel: `Gallery, ${figures.length} images` },
  children: [
    {
      type: 'element',
      tagName: 'ul',
      properties: { role: 'list', className: ['gallery-track'] },
      children: figures.map((f) => ({
        type: 'element',
        tagName: 'li',
        properties: {},
        children: [f],
      })),
    },
  ],
});

/* An image alone in its paragraph becomes a figure that links to its file, captioned by its alt.
   Images on adjacent lines share a paragraph and become one gallery. Images in running text, and
   images that are already links, stay as they are. */
export const media = (): ((tree: Root) => void) => (tree: Root) => {
  let count = 0;
  visit(tree, 'element', (node, index, parent) => {
    if (node.tagName !== 'p' || index === undefined || !parent) {
      return;
    }
    const images = imagesOnly(node);
    if (!images) {
      return;
    }
    const figures = images.map((img) => figure(img, ++count));
    parent.children[index] = figures.length === 1 && figures[0] ? figures[0] : gallery(figures);
    return SKIP;
  });
};
