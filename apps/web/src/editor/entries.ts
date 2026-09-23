import type { Bundle, GitHubClient, PullRequest } from "@crc/github-client";
import { parseEntry } from "@crc/markdown";
import { queryOptions } from "@tanstack/react-query";
import { CONTENT_ROOT, type EntryKind } from "./drafts/paths.ts";
import { editorKeys } from "./github/queries.ts";

/* One list for everything the editor can open, whatever backend is behind it: entries already on the
   default branch (or, in working-tree mode, on disk) plus the draft branches in flight. */

export type EntryStatus = "draft" | "pull-request" | "published" | "working-tree";

export type EditorEntry = {
  /** Unknown for a draft branch with nothing published under the same slug: reading every draft
      branch to find out would be one request per row, which the board does not earn. */
  kind?: EntryKind;
  slug: string;
  dir: string;
  title: string;
  date: string;
  draft: boolean;
  status: EntryStatus;
  /** Branch the entry is read from; for published entries this is the default branch. */
  ref: string;
  pr?: PullRequest | null;
};

/** Reads every index.md in a content tree. Invalid frontmatter is skipped rather than failing the board. */
export function entriesFromBundle(bundle: Bundle, status: EntryStatus): EditorEntry[] {
  const out: EditorEntry[] = [];
  for (const file of bundle.files) {
    if (!file.path.endsWith("/index.md")) continue;
    const kind: EntryKind = file.path.startsWith(`${CONTENT_ROOT}/pages/`) ? "page" : "post";
    try {
      const { meta } = parseEntry(file.content);
      out.push({
        kind,
        slug: meta.slug,
        dir: file.path.slice(0, -"/index.md".length),
        title: meta.title,
        date: meta.date.toISOString().slice(0, 10),
        draft: meta.draft,
        status,
        ref: bundle.ref,
      });
    } catch {
      // A malformed entry is a content problem, surfaced by the build; the board just skips it.
    }
  }
  return out.sort((a, b) =>
    a.date === b.date ? a.slug.localeCompare(b.slug) : b.date.localeCompare(a.date),
  );
}

export const publishedQuery = (
  gh: GitHubClient,
  defaultBranch: string,
  status: EntryStatus = "published",
) =>
  queryOptions({
    queryKey: editorKeys.published(),
    queryFn: async () =>
      entriesFromBundle(await gh.readBundle(defaultBranch, CONTENT_ROOT), status),
    staleTime: 15_000,
  });

/** Draft branches shadow the published entry with the same slug, so only one row appears per slug. */
export function mergeEntries(
  published: readonly EditorEntry[],
  drafts: readonly { ref: string; slug: string; pr: PullRequest | null }[],
): EditorEntry[] {
  const bySlug = new Map(published.map((e) => [e.slug, e]));
  const rows: EditorEntry[] = [];
  for (const draft of drafts) {
    const base = bySlug.get(draft.slug);
    bySlug.delete(draft.slug);
    rows.push({
      ...(base?.kind ? { kind: base.kind } : {}),
      slug: draft.slug,
      dir: base?.dir ?? "",
      title: base?.title ?? draft.slug,
      date: base?.date ?? "",
      draft: base?.draft ?? true,
      status: draft.pr ? "pull-request" : "draft",
      ref: draft.ref,
      pr: draft.pr,
    });
  }
  return [...rows, ...bySlug.values()];
}
