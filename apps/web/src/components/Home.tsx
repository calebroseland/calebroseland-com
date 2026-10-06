import { Link } from '@tanstack/react-router';
import { posts } from '../content/entries.ts';
import styles from './Home.module.css';
import { Page } from './Page.tsx';
import { PostList } from './PostList.tsx';

const LATEST = 3;

/* The site past the card: where "Enter" lands. Placeholder until real home copy exists. */
export function Home() {
  return (
    <Page>
      <h1 className={styles.title}>Latest writing</h1>
      {posts.length === 0 ? (
        <p role="status">Nothing published yet.</p>
      ) : (
        <>
          <PostList posts={posts.slice(0, LATEST)} />
          <p className={styles.all}>
            <Link to="/posts">All posts</Link>
          </p>
        </>
      )}
    </Page>
  );
}
