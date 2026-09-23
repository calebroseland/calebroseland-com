import type { Entry } from "@crc/content-schema";
import type { Draft, FileInput, GitHubClient } from "@crc/github-client";
import { serializeEntry } from "@crc/markdown";
import { type QueryClient, queryOptions } from "@tanstack/react-query";
import type { Buffer } from "../drafts/buffer.ts";
import { bundleDirFor, CONTENT_ROOT, type EntryKind, findEntryDir } from "../drafts/paths.ts";
import { editorKeys } from "./queries.ts";

/** Everything under content/ on a branch: locates any entry's bundle, posts and pages alike. */
export const contentTreeQuery = (gh: GitHubClient, ref: string) =>
  queryOptions({
    queryKey: editorKeys.bundle(ref, CONTENT_ROOT),
    queryFn: () => gh.readBundle(ref, CONTENT_ROOT),
    staleTime: 10_000,
  });

/** meta mirrors an Entry with the date as a string; the kind discriminant is carried through. */
function toFrontmatter(meta: Buffer["meta"]): Entry {
  return { ...meta, date: new Date(meta.date) } as Entry;
}

function bundleFiles(b: Buffer): FileInput[] {
  const index: FileInput = {
    path: "index.md",
    content: serializeEntry({ meta: toFrontmatter(b.meta), body: b.markdown }),
  };
  // The file itself is handed over: the working-tree backend streams it to disk, and the GitHub
  // backends read the bytes when they build the blob.
  const assets: FileInput[] = b.assets.map((a) => ({ path: a.name, content: a.blob }));
  return [index, ...assets];
}

export async function createEntryDraft(
  gh: GitHubClient,
  input: { kind: EntryKind; title: string; slug: string; date: Date },
): Promise<{ draft: Draft; dir: string; headSha: string }> {
  const draft = await gh.createDraft(input.slug);
  const dir = bundleDirFor(input.kind, input.date, input.slug);
  const meta = {
    kind: input.kind,
    title: input.title,
    slug: input.slug,
    date: input.date,
    draft: true,
    tags: [],
    placeholder: false,
  } as Entry;
  const { headSha } = await gh.saveBundle({
    ref: draft.ref,
    dir,
    files: [{ path: "index.md", content: serializeEntry({ meta, body: "" }) }],
    message: `${input.kind}: start "${input.title}"`,
    expectedHeadSha: draft.headSha,
  });
  return { draft, dir, headSha };
}

/* Editing something already on the default branch: branch from it and leave the files alone, so the
   existing bundle directory is reused rather than a second one minted under today's date. */
export async function beginEditing(gh: GitHubClient, slug: string): Promise<Draft> {
  const existing = (await gh.listDrafts()).find((d) => d.slug === slug);
  if (existing) return existing;
  return gh.createDraft(slug);
}

export async function saveDraft(
  gh: GitHubClient,
  b: Buffer,
): Promise<{ headSha: string; commitUrl: string }> {
  return gh.saveBundle({
    ref: b.ref,
    dir: b.dir,
    files: bundleFiles(b),
    message: `${b.meta.kind}: update "${b.meta.title}"`,
    expectedHeadSha: b.baseHeadSha,
  });
}

export async function invalidateDraft(queryClient: QueryClient, ref: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: editorKeys.all }),
    queryClient.invalidateQueries({ queryKey: editorKeys.bundle(ref, CONTENT_ROOT) }),
  ]);
}

export { findEntryDir };
