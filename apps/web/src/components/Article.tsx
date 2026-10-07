import { Icon } from '@crc/ui';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type { EntryMeta, LoadedEntry } from '../content/entries.ts';
import { formatDate } from '../content/entries.ts';
import { useSignedIn } from '../editor/auth/hooks.ts';
import { useCurrentHref } from '../hooks/useCurrentHref.ts';
import styles from './Article.module.css';

/** An entry's title and meta; `action` takes the Edit link's place on a page that is not an entry. */
export const EntryHeader = ({
  meta,
  showMeta = true,
  action,
}: {
  meta: EntryMeta;
  showMeta?: boolean;
  action?: ReactNode;
}) => {
  return (
    <header className={styles.header}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{meta.title}</h1>
        {action ?? (meta.id && meta.slug && <EditEntry slug={meta.slug} title={meta.title} />)}
      </div>
      {showMeta && (
        <div className={styles.meta}>
          <time dateTime={meta.date}>{formatDate(meta.date)}</time>
          {meta.tags.length > 0 && <TagList tags={meta.tags} />}
        </div>
      )}
    </header>
  );
};

/** Signed in, an editor can open this entry in the editor from the page itself. */
const EditEntry = ({ slug, title }: { slug: string; title: string }) => {
  const signedIn = useSignedIn();
  const here = useCurrentHref();
  if (!signedIn) {
    return null;
  }
  return (
    <Link
      to="/editor/$slug"
      params={{ slug }}
      search={{ from: here }}
      className={styles.edit}
      aria-label={`Edit ${title}`}
    >
      <Icon name="lucide:pencil-line" size="sm" />
      Edit
    </Link>
  );
};

/** Tags as chips linking to the posts they filter; `all` leads with a chip for every post. */
export const TagList = ({
  tags,
  all = false,
  className,
}: {
  tags: readonly string[];
  all?: boolean;
  className?: string | undefined;
}) => {
  return (
    <ul role="list" className={`${styles.tags} ${className ?? ''}`} aria-label="Tags">
      {all && (
        <li>
          {/* Exact, so All is current only while no tag is chosen. */}
          <Link to="/posts" search={{}} activeOptions={{ exact: true }} className={styles.tag}>
            All
          </Link>
        </li>
      )}
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
};

export const ArticleBody = ({ entry }: { entry: LoadedEntry }) => {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: html is produced at build time by @crc/markdown through rehype-sanitize
  return <div className="prose" dangerouslySetInnerHTML={{ __html: entry.html }} />;
};

export const ArticleSkeleton = () => {
  return (
    <div className={styles.skeleton} role="status" aria-busy="true" aria-label="Loading">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
};
