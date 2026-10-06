import rehypeShiki from '@shikijs/rehype';
import type { Element, Root } from 'hast';
import rehypeSanitize from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { sanitizeSchema } from './sanitize.ts';

export type RenderOptions = {
  /** Called for every relative image src; return the URL to use instead. Build time rewrites to hashed assets. */
  resolveImage?: (src: string) => string;
};

export type Rendered = {
  html: string;
  images: string[];
  headings: Array<{ depth: number; id: string; text: string }>;
};

function collect(
  images: string[],
  headings: Rendered['headings'],
  resolveImage?: RenderOptions['resolveImage'],
) {
  return () => (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      // Shiki writes `class` and `tabindex`; the sanitizer only knows the hast property names.
      if (node.properties.class !== undefined) {
        node.properties.className = String(node.properties.class).split(/\s+/).filter(Boolean);
        delete node.properties.class;
      }
      if (node.properties.tabindex !== undefined) {
        node.properties.tabIndex = Number(node.properties.tabindex);
        delete node.properties.tabindex;
      }
      // GFM task-list checkboxes are disabled inputs with no label; name them for assistive tech.
      if (node.tagName === 'input' && node.properties.type === 'checkbox') {
        node.properties.ariaLabel = node.properties.checked ? 'Completed' : 'Not completed';
      }
      if (node.tagName === 'img' && typeof node.properties.src === 'string') {
        const src = node.properties.src;
        if (!/^(https?:)?\/\//.test(src) && !src.startsWith('data:')) {
          images.push(src);
          if (resolveImage) {
            node.properties.src = resolveImage(src);
          }
        }
        node.properties.loading = 'lazy';
        node.properties.decoding = 'async';
      }
      if (/^h[1-6]$/.test(node.tagName) && typeof node.properties.id === 'string') {
        const text = node.children
          .map((c) => (c.type === 'text' ? c.value : ''))
          .join('')
          .trim();
        headings.push({ depth: Number(node.tagName[1]), id: node.properties.id, text });
      }
      if (
        node.tagName === 'a'
        && typeof node.properties.href === 'string'
        && /^https?:\/\//.test(node.properties.href)
      ) {
        node.properties.rel = ['noopener', 'noreferrer'];
        node.properties.target = '_blank';
      }
    });
  };
}

/** Markdown (GFM) → sanitized HTML with Shiki dual-theme highlighting driven by CSS variables. */
export async function renderMarkdown(
  markdown: string,
  opts: RenderOptions = {},
): Promise<Rendered> {
  const images: string[] = [];
  const headings: Rendered['headings'] = [];
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeShiki, {
      themes: { light: 'github-light-high-contrast', dark: 'github-dark-high-contrast' },
      defaultColor: false,
      fallbackLanguage: 'text',
      transformers: [
        {
          name: 'crc:language-class',
          pre(node) {
            node.properties.dataLanguage = this.options.lang;
          },
          code(node) {
            this.addClassToHast(node, `language-${this.options.lang}`);
          },
        },
      ],
    })
    .use(collect(images, headings, opts.resolveImage))
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)
    .process(markdown);
  return { html: String(file), images, headings };
}
