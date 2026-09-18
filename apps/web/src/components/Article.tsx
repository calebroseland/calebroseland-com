import { Link } from "@tanstack/react-router";
import type { EntryMeta, LoadedEntry } from "../content/entries.ts";
import { formatDate } from "../content/entries.ts";
import styles from "./Article.module.css";

export function EntryHeader({ meta, showMeta = true }: { meta: EntryMeta; showMeta?: boolean }) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{meta.title}</h1>
      {showMeta && (
        <div className={styles.meta}>
          <time dateTime={meta.date}>{formatDate(meta.date)}</time>
          {meta.tags.length > 0 && <TagList tags={meta.tags} />}
        </div>
      )}
    </header>
  );
}

export function TagList({ tags }: { tags: readonly string[] }) {
  return (
    <ul className={styles.tags} aria-label="Tags">
      {tags.map((tag) => (
        <li key={tag}>
          {/* Link sets data-status="active" and aria-current="page" itself, matching path and search. */}
          <Link to="/posts" search={{ tag }} className={styles.tag}>
            {tag}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ArticleBody({ entry }: { entry: LoadedEntry }) {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: html is produced at build time by @crc/markdown through rehype-sanitize
  return <div className="prose" dangerouslySetInnerHTML={{ __html: entry.html }} />;
}

export function ArticleSkeleton() {
  return (
    <div className={styles.skeleton} aria-busy="true" aria-label="Loading">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}
