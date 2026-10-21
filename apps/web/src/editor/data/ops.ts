import type { Entry } from '@crc/content-schema';
import { serializeEntry } from '@crc/markdown';
import type { Buffer } from '../drafts/buffer.ts';
import { bundleDirFor, type EntryKind } from '../drafts/paths.ts';
import { type FileInput, readTree, writeFiles } from '../workingTree.ts';

/* The editor's writes, as plain async functions. Caching is not their concern: the mutation options in
   mutations.ts say what each write makes stale. */

/** meta mirrors an Entry with the date as a string; the kind discriminant is carried through. */
const toFrontmatter = (meta: Buffer['meta']): Entry => {
  return { ...meta, date: new Date(meta.date) } as Entry;
};

const bundleFiles = (b: Buffer): FileInput[] => {
  const index: FileInput = {
    path: 'index.md',
    content: serializeEntry({ meta: toFrontmatter(b.meta), body: b.markdown }),
  };
  // The file itself is handed over, so it is streamed to disk as bytes.
  const assets: FileInput[] = b.assets.map((a) => ({ path: a.name, content: a.blob }));
  return [index, ...assets];
};

export type NewEntry = { kind: EntryKind; title: string; slug: string; date: Date };

export const createEntry = async (input: NewEntry): Promise<{ slug: string; dir: string }> => {
  const dir = bundleDirFor(input.kind, input.date, input.slug);
  const meta = {
    kind: input.kind,
    title: input.title,
    slug: input.slug,
    date: input.date,
    draft: true,
    tags: [],
  } as Entry;
  const { headSha } = await readTree();
  await writeFiles({
    dir,
    files: [{ path: 'index.md', content: serializeEntry({ meta, body: '' }) }],
    expectedHeadSha: headSha,
  });
  return { slug: input.slug, dir };
};

export const saveEntry = (b: Buffer): Promise<{ headSha: string }> => {
  return writeFiles({ dir: b.dir, files: bundleFiles(b), expectedHeadSha: b.baseHeadSha });
};
