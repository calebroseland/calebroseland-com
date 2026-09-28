import { Icon } from "@crc/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as z from "zod/mini";
import { EntryHeader, TagList } from "../components/Article.tsx";
import { Page } from "../components/Page.tsx";
import { PostList } from "../components/PostList.tsx";
import { allTags, posts } from "../content/entries.ts";
import { siteProfile } from "../content/profile.ts";
import styles from "./posts.module.css";

// zod/mini keeps the full zod runtime out of the site shell; route schemas are small and tree-shakeable.
const search = z.object({ tag: z.optional(z.string()) });

export const Route = createFileRoute("/posts/")({
  validateSearch: search,
  component: PostsIndex,
  head: () => ({
    meta: [{ title: `Posts · ${siteProfile.name}` }, { name: "description", content: "Posts" }],
    links: [
      { rel: "alternate", type: "application/rss+xml", title: siteProfile.name, href: "/feed.xml" },
    ],
  }),
});

function PostsIndex() {
  const { tag } = Route.useSearch();
  const shown = tag ? posts.filter((p) => p.tags.includes(tag)) : posts;
  return (
    <Page>
      <EntryHeader
        meta={{
          id: "",
          dir: "",
          kind: "page",
          title: "Posts",
          slug: "posts",
          date: "",
          draft: false,
          tags: [],
          placeholder: false,
        }}
        showMeta={false}
      />
      <div className={styles.filters}>
        {allTags.length > 0 && <TagList tags={allTags} />}
        {tag && (
          <Link to="/posts" search={{}} className={styles.clear}>
            Clear filter
          </Link>
        )}
        <a href="/feed.xml" className={styles.feed}>
          <Icon name="lucide:rss" size="sm" />
          RSS feed
        </a>
      </div>
      {shown.length === 0 ? (
        <p role="status">{tag ? `No posts tagged ‘${tag}’.` : "Nothing published yet."}</p>
      ) : (
        <PostList posts={shown} />
      )}
    </Page>
  );
}
