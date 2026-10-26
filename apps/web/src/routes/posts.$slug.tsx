import { createFileRoute, notFound } from '@tanstack/react-router';
import { ArticleBody, ArticleSkeleton, EntryHeader } from '../components/Article.tsx';
import { CenteredMessage, Page } from '../components/Page.tsx';
import { viewSearch } from '../components/viewer/search.ts';
import { findBySlug, loadEntry } from '../content/entries.ts';
import { siteProfile } from '../content/profile.ts';

/** The post this route loaded. */
const usePost = () => {
  return Route.useLoaderData();
};

const PostRoute = () => {
  const entry = usePost();
  return (
    <Page reading>
      <article>
        <EntryHeader meta={entry.meta} />
        <ArticleBody entry={entry} />
      </article>
    </Page>
  );
};

export const Route = createFileRoute('/posts/$slug')({
  validateSearch: viewSearch,
  loader: async ({ params }) => {
    const meta = findBySlug('post', params.slug);
    if (!meta) {
      throw notFound();
    }
    return loadEntry(meta.id);
  },
  pendingComponent: () => (
    <Page>
      <ArticleSkeleton />
    </Page>
  ),
  notFoundComponent: () => (
    <Page>
      <CenteredMessage title="That post isn't here.">
        <p>
          <a href="/posts">All posts</a>
        </p>
      </CenteredMessage>
    </Page>
  ),
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.meta.title} · ${siteProfile.name}` },
          { name: 'description', content: loaderData.meta.summary ?? loaderData.meta.title },
          { property: 'og:title', content: loaderData.meta.title },
          { property: 'og:type', content: 'article' },
          ...(loaderData.meta.hero
            ? [{ property: 'og:image', content: loaderData.meta.hero }]
            : []),
        ]
      : [{ name: 'robots', content: 'noindex' }],
  }),
  component: PostRoute,
});
