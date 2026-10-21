import { parseEntry } from '@crc/markdown';
import type { Tree } from '../workingTree.ts';
import type { Buffer } from './buffer.ts';
import { findEntryDir } from './paths.ts';

/** Turns the content tree into an editor buffer for one slug, whichever kind owns it. */
export const bufferFromTree = (tree: Tree, slug: string): Buffer => {
  const paths = tree.files.map((f) => f.path);
  const found = findEntryDir(paths, slug);
  if (!found) {
    throw new Error(`No entry for "${slug}" in the content tree`);
  }
  const { dir } = found;
  const index = tree.files.find((f) => f.path === `${dir}/index.md`);
  if (!index) {
    throw new Error(`Missing index.md in ${dir}`);
  }
  const { meta, body } = parseEntry(index.content);
  return {
    dir,
    baseHeadSha: tree.headSha,
    markdown: body.trim(),
    meta: { ...meta, date: meta.date.toISOString().slice(0, 10) },
    assets: [],
    existingAssets: tree.files
      .filter((f) => f.path.startsWith(`${dir}/`) && f.path !== `${dir}/index.md`)
      .map((f) => f.path.slice(dir.length + 1)),
    dirty: false,
    restoredFromLocal: false,
    imagesDropped: false,
    updatedAt: new Date().toISOString(),
  };
};
