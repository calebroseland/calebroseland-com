import type { Bundle } from "@crc/github-client";
import { parseEntry } from "@crc/markdown";
import type { Buffer } from "./buffer.ts";
import { findBundleDir } from "./paths.ts";

/** Turns a branch's content/posts tree into an editor buffer for one draft slug. */
export function bufferFromBundle(bundle: Bundle, slug: string): Buffer {
  const dir = findBundleDir(
    bundle.files.map((f) => f.path),
    slug,
  );
  if (!dir) throw new Error(`No bundle for "${slug}" on ${bundle.ref}`);
  const index = bundle.files.find((f) => f.path === `${dir}/index.md`);
  if (!index) throw new Error(`Missing index.md in ${dir}`);
  const { meta, body } = parseEntry(index.content);
  if (meta.kind !== "post") throw new Error(`Bundle ${dir} is a ${meta.kind}, not a post`);
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
    updatedAt: new Date().toISOString(),
  };
}
