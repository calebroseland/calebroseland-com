import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArticleBody, ArticleSkeleton, EntryHeader } from "../components/Article.tsx";
import { CenteredMessage, Page } from "../components/Page.tsx";
import { findBySlug, loadEntry } from "../content/entries.ts";
import { siteProfile } from "../content/profile.ts";

export const Route = createFileRoute("/posts/$slug")({
  loader: async ({ params }) => {
    const meta = findBySlug("post", params.slug);
    if (!meta) throw notFound();
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
          { name: "description", content: loaderData.meta.summary ?? loaderData.meta.title },
          { property: "og:title", content: loaderData.meta.title },
          { property: "og:type", content: "article" },
          ...(loaderData.meta.hero
            ? [{ property: "og:image", content: loaderData.meta.hero }]
            : []),
        ]
      : [{ name: "robots", content: "noindex" }],
  }),
  component: PostRoute,
});

function PostRoute() {
  const entry = Route.useLoaderData();
  return (
    <Page>
      <article>
        <EntryHeader meta={entry.meta} />
        <ArticleBody entry={entry} />
      </article>
    </Page>
  );
}
