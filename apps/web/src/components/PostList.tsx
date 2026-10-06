import { Stack } from '@crc/ui';
import { Link } from '@tanstack/react-router';
import { type EntryMeta, formatDate } from '../content/entries.ts';
import styles from './PostList.module.css';

export function PostList({ posts }: { posts: readonly EntryMeta[] }) {
  return (
    <Stack as="ol" gap="8" role="list" className={styles.list}>
      {posts.map((p) => (
        <li key={p.id}>
          <article className={styles.item}>
            <h2 className={styles.itemTitle}>
              <Link to="/posts/$slug" params={{ slug: p.slug }}>
                {p.title}
              </Link>
            </h2>
            <time dateTime={p.date} className={styles.itemDate}>
              {formatDate(p.date)}
            </time>
            {p.summary && <p className={styles.summary}>{p.summary}</p>}
          </article>
        </li>
      ))}
    </Stack>
  );
}
