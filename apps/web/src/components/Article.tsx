import { Icon } from "@crc/ui";
import { mdiPencilOutline } from "@crc/ui/icons";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import type { EntryMeta, LoadedEntry } from "../content/entries.ts";
import { formatDate } from "../content/entries.ts";
import { session } from "../editor/auth/store.ts";
import styles from "./Article.module.css";

export function EntryHeader({ meta, showMeta = true }: { meta: EntryMeta; showMeta?: boolean }) {
  return (
    <header className={styles.header}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{meta.title}</h1>
        {meta.slug && <EditEntry slug={meta.slug} title={meta.title} />}
      </div>
      {showMeta && (
        <div className={styles.meta}>
          <time dateTime={meta.date}>{formatDate(meta.date)}</time>
          {meta.tags.length > 0 && <TagList tags={meta.tags} />}
        </div>
      )}
    </header>
  );
}

/** Signed in, an editor can open this entry in the editor from the page itself. */
function EditEntry({ slug, title }: { slug: string; title: string }) {
  const signedIn = useStore(session.store, (s) => s.status === "authenticated");
  if (!signedIn) return null;
  return (
    <Link to="/editor/$slug" params={{ slug }} className={styles.edit} aria-label={`Edit ${title}`}>
      <Icon path={mdiPencilOutline} size="sm" />
      Edit
    </Link>
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
