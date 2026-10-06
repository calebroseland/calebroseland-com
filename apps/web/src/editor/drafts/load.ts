import type { Bundle } from '@crc/github-client';
import { parseEntry } from '@crc/markdown';
import type { Buffer } from './buffer.ts';
import { findEntryDir } from './paths.ts';

/** Turns a content tree into an editor buffer for one slug, whichever kind owns it. */
export function bufferFromBundle(bundle: Bundle, slug: string): Buffer {
  const paths = bundle.files.map((f) => f.path);
  const found = findEntryDir(paths, slug);
  if (!found) {
    throw new Error(`No bundle for "${slug}" on ${bundle.ref}`);
  }
  const { dir } = found;
  const index = bundle.files.find((f) => f.path === `${dir}/index.md`);
  if (!index) {
    throw new Error(`Missing index.md in ${dir}`);
  }
  const { meta, body } = parseEntry(index.content);
  return {
    ref: bundle.ref,
    dir,
    baseHeadSha: bundle.headSha,
    markdown: body.trim(),
    meta: { ...meta, date: meta.date.toISOString().slice(0, 10) },
    assets: [],
    existingAssets: bundle.files
      .filter((f) => f.path.startsWith(`${dir}/`) && f.path !== `${dir}/index.md`)
      .map((f) => f.path.slice(dir.length + 1)),
    dirty: false,
    restoredFromLocal: false,
    imagesDropped: false,
    updatedAt: new Date().toISOString(),
  };
}
