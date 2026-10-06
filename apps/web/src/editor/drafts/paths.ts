/* Bundle path conventions. A post's directory is date-prefixed and immutable; a page's is just its
   slug. The display slug always lives in frontmatter, so renaming never moves a directory. */

export type EntryKind = 'post' | 'page';

export const CONTENT_ROOT = 'content';
const POSTS_ROOT = `${CONTENT_ROOT}/posts`;
const PAGES_ROOT = `${CONTENT_ROOT}/pages`;

const rootFor = (kind: EntryKind) => (kind === 'page' ? PAGES_ROOT : POSTS_ROOT);

export const bundleDirFor = (kind: EntryKind, date: Date, slug: string): string => {
  if (kind === 'page') {
    return `${PAGES_ROOT}/${slug}`;
  }
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${POSTS_ROOT}/${y}/${m}-${d}-${slug}`;
};

/** Finds one kind's bundle directory for a slug among a list of repo paths (e.g. tree entries). */
export const findBundleDir = (
  paths: readonly string[],
  kind: EntryKind,
  slug: string,
): string | null => {
  const root = rootFor(kind);
  const hit =
    kind === 'page'
      ? paths.find((p) => p === `${root}/${slug}/index.md`)
      : paths.find((p) => p.startsWith(`${root}/`) && p.endsWith(`-${slug}/index.md`));
  return hit ? hit.slice(0, -'/index.md'.length) : null;
};

/** Resolves a slug to whichever kind owns it. Posts win a tie, which the content schema makes rare. */
export const findEntryDir = (
  paths: readonly string[],
  slug: string,
): { kind: EntryKind; dir: string } | null => {
  for (const kind of ['post', 'page'] as const) {
    const dir = findBundleDir(paths, kind, slug);
    if (dir) {
      return { kind, dir };
    }
  }
  return null;
};

export const slugify = (input: string): string => {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
};
