import Paragraph from '@tiptap/extension-paragraph';
import { type JSONContent, type MarkdownToken, mergeAttributes, Node } from '@tiptap/react';

/* Images on adjacent lines are one paragraph in markdown, and the site shows them as a gallery. Images
   here are block nodes, so a paragraph cannot hold them; they load into a gallery node instead, which
   writes them back one per line. Blank-line-separated images stay separate images. */

// A line break between images (two trailing spaces or a trailing backslash) is still just a new line.
const isBlank = (t: MarkdownToken) =>
  t.type === 'br' || (t.type === 'text' && /^\s*$/.test(t.raw ?? ''));

/** The images of a paragraph that holds two or more images and nothing else, or null. */
const galleryImages = (token: MarkdownToken): MarkdownToken[] | null => {
  const tokens = token.tokens ?? [];
  const images = tokens.filter((t) => t.type === 'image');
  return images.length > 1 && tokens.every((t) => t.type === 'image' || isBlank(t)) ? images : null;
};

export const Gallery = Node.create({
  name: 'gallery',
  group: 'block',
  content: 'image+',
  parseHTML: () => [{ tag: 'div[data-gallery]' }],
  renderHTML: ({ HTMLAttributes }) => [
    'div',
    mergeAttributes(HTMLAttributes, { 'data-gallery': '' }),
    0,
  ],
  renderMarkdown: (node: JSONContent, h) => h.renderChildren(node.content ?? [], '\n'),
});

const parseParagraph = Paragraph.config.parseMarkdown;

export const GalleryParagraph = Paragraph.extend({
  parseMarkdown: (token, helpers) => {
    const images = galleryImages(token);
    if (images) {
      return helpers.createNode('gallery', undefined, helpers.parseChildren(images));
    }
    return parseParagraph?.(token, helpers) ?? [];
  },
});
