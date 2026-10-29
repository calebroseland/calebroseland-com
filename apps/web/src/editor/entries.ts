import { parseEntry } from '@crc/markdown';
import { CONTENT_ROOT, type EntryKind } from './drafts/paths.ts';
import type { Tree } from './workingTree.ts';

/* Every entry on disk that the editor can open: posts and pages alike. */

export type EditorEntry = {
  kind: EntryKind;
  slug: string;
  dir: string;
  title: string;
  date: string;
  draft: boolean;
};

/** Reads every index.md in the content tree. Invalid frontmatter is skipped rather than failing the board. */
export const entriesFromTree = (tree: Tree): EditorEntry[] => {
  const out: EditorEntry[] = [];
  for (const file of tree.files) {
    if (!file.path.endsWith('/index.md')) {
      continue;
    }
    const kind: EntryKind = file.path.startsWith(`${CONTENT_ROOT}/pages/`) ? 'page' : 'post';
    try {
      const { meta } = parseEntry(file.content);
      out.push({
        kind,
        slug: meta.slug,
        dir: file.path.slice(0, -'/index.md'.length),
        title: meta.title,
        date: meta.date.toISOString().slice(0, 10),
        draft: meta.draft,
      });
    } catch {
      // A malformed entry is a content problem, surfaced by the build; the board just skips it.
    }
  }
  return out.sort((a, b) =>
    a.date === b.date ? a.slug.localeCompare(b.slug) : b.date.localeCompare(a.date),
  );
};
