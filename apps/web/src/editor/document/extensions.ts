import Image, { type ImageOptions } from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from '@tiptap/markdown';
import type { Extensions } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Gallery, GalleryParagraph } from './gallery.ts';

/** The document's node set and markdown handling; `previewSrc` maps a written image name to a loadable URL. */
export const documentExtensions = (previewSrc: (src: string) => string): Extensions => [
  StarterKit.configure({
    paragraph: false,
    heading: { levels: [1, 2, 3] },
    codeBlock: { HTMLAttributes: { class: 'code' } },
    link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
  }),
  GalleryParagraph,
  Gallery,
  Markdown,
  PreviewImage.configure({ inline: false, allowBase64: true, previewSrc }),
  Placeholder.configure({ placeholder: 'Write. Type / for commands, paste or drop an image.' }),
];

/* Relative names ("hero.png") would resolve against the editor's own URL, so the rendered src is the
   preview while data-src keeps the name, which is what copy and paste inside the editor read back. */
const PreviewImage = Image.extend<ImageOptions & { previewSrc: (src: string) => string }>({
  addOptions() {
    return { ...this.parent?.(), previewSrc: (src: string) => src } as ImageOptions & {
      previewSrc: (src: string) => string;
    };
  },
  addAttributes() {
    const previewSrc = this.options.previewSrc;
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-src') ?? el.getAttribute('src'),
        renderHTML: (attrs) =>
          attrs.src ? { src: previewSrc(attrs.src as string), 'data-src': attrs.src } : {},
      },
    };
  },
});
