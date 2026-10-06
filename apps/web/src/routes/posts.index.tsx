import { Icon } from '@crc/ui';
import { createFileRoute } from '@tanstack/react-router';
import * as z from 'zod/mini';
import { EntryHeader, TagList } from '../components/Article.tsx';
import { Page } from '../components/Page.tsx';
import { PostList } from '../components/PostList.tsx';
import { Tip } from '../components/Tip.tsx';
import { allTags, posts } from '../content/entries.ts';
import { siteProfile } from '../content/profile.ts';
import styles from './posts.module.css';

// zod/mini keeps the full zod runtime out of the site shell; route schemas are small and tree-shakeable.
const search = z.object({ tag: z.optional(z.string()) });

export const Route = createFileRoute('/posts/')({
  validateSearch: search,
  component: PostsIndex,
  head: () => ({
    meta: [{ title: `Posts · ${siteProfile.name}` }, { name: 'description', content: 'Posts' }],
    links: [
      { rel: 'alternate', type: 'application/rss+xml', title: siteProfile.name, href: '/feed.xml' },
    ],
  }),
});

/** The tag the list is narrowed to, from the URL. */
function useTagFilter() {
  return Route.useSearch().tag;
}

function PostsIndex() {
  const tag = useTagFilter();
  const shown = tag ? posts.filter((p) => p.tags.includes(tag)) : posts;
  return (
    // The measure, like the header and list inside it, so the column sits on the page's axis.
    <Page width="measure">
      <EntryHeader
        meta={{
          id: '',
          dir: '',
          kind: 'page',
          title: 'Posts',
          slug: 'posts',
          date: '',
          draft: false,
          tags: [],
        }}
        showMeta={false}
        action={
          <Tip label="RSS feed">
            <a href="/feed.xml" className={styles.feed} aria-label="RSS feed">
              <Icon name="lucide:rss" size="sm" />
            </a>
          </Tip>
        }
      />
      {allTags.length > 0 && <TagList tags={allTags} all className={styles.filters} />}
      {shown.length === 0 ? (
        <p role="status">{tag ? `No posts tagged ‘${tag}’.` : 'Nothing published yet.'}</p>
      ) : (
        <PostList posts={shown} />
      )}
    </Page>
  );
}
