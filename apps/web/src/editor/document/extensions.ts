import type { ImageSize } from '@crc/markdown';
import Image, { type ImageOptions } from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from '@tiptap/markdown';
import type { Extensions } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Gallery, GalleryParagraph } from './gallery.ts';

/** An image as the editor shows it: a URL the browser can load, and its size when known, so its
    space is held before it loads. */
export type ImagePreview = { src: string; size?: ImageSize };

type Preview = (src: string) => ImagePreview;

/** The document's node set and markdown handling; `preview` maps a written image name to what to show. */
export const documentExtensions = (preview: Preview): Extensions => [
  StarterKit.configure({
    paragraph: false,
    heading: { levels: [1, 2, 3] },
    codeBlock: { HTMLAttributes: { class: 'code' } },
    link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
  }),
  GalleryParagraph,
  Gallery,
  Markdown,
  PreviewImage.configure({ inline: false, allowBase64: true, preview }),
  Placeholder.configure({ placeholder: 'Write. Type / for commands, paste or drop an image.' }),
];

/* Relative names ("hero.png") would resolve against the editor's own URL, so the rendered src is the
   preview while data-src keeps the name, which is what copy and paste inside the editor read back.
   The preview's size goes on the element only, never the node, so the markdown stays as written. */
const PreviewImage = Image.extend<ImageOptions & { preview: Preview }>({
  addOptions() {
    return { ...this.parent?.(), preview: (src: string) => ({ src }) } as ImageOptions & {
      preview: Preview;
    };
  },
  addAttributes() {
    const preview = this.options.preview;
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-src') ?? el.getAttribute('src'),
        renderHTML: (attrs) => {
          if (!attrs.src) {
            return {};
          }
          const shown = preview(attrs.src as string);
          return { src: shown.src, 'data-src': attrs.src, ...shown.size };
        },
      },
      width: { default: null, rendered: false },
      height: { default: null, rendered: false },
    };
  },
});
