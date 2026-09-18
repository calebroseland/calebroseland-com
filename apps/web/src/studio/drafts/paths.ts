/* Bundle path conventions. Directory names are date-prefixed and immutable; the display slug lives in frontmatter. */

export const POSTS_ROOT = "content/posts";

export function bundleDirFor(date: Date, slug: string): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${POSTS_ROOT}/${y}/${m}-${d}-${slug}`;
}

/** Finds the bundle directory for a slug among a list of repo paths (e.g. tree entries). */
export function findBundleDir(paths: readonly string[], slug: string): string | null {
  const suffix = `-${slug}/index.md`;
  const hit = paths.find((p) => p.startsWith(`${POSTS_ROOT}/`) && p.endsWith(suffix));
  return hit ? hit.slice(0, -"/index.md".length) : null;
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
