import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArticleBody, ArticleSkeleton, EntryHeader } from "../components/Article.tsx";
import { CenteredMessage, Page } from "../components/Page.tsx";
import { findBySlug, loadEntry } from "../content/entries.ts";
import { siteProfile } from "../content/profile.ts";

/* Top-level pages such as /about. Studio routes are more specific and win. */
export const Route = createFileRoute("/$slug")({
  loader: async ({ params }) => {
    const meta = findBySlug("page", params.slug);
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
      <CenteredMessage title="That page isn't here.">
        <p>
          <a href="/">Back to the start</a>
        </p>
      </CenteredMessage>
    </Page>
  ),
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [{ title: `${loaderData.meta.title} · ${siteProfile.name}` }]
      : [{ name: "robots", content: "noindex" }],
  }),
  component: PageRoute,
});

function PageRoute() {
  const entry = Route.useLoaderData();
  return (
    <Page width="measure">
      <article>
        <EntryHeader meta={entry.meta} showMeta={false} />
        <ArticleBody entry={entry} />
      </article>
    </Page>
  );
}
