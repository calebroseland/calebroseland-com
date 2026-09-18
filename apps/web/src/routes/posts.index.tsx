import { Stack } from "@crc/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as z from "zod/mini";
import { EntryHeader, TagList } from "../components/Article.tsx";
import { Page } from "../components/Page.tsx";
import { allTags, formatDate, posts } from "../content/entries.ts";
import { siteProfile } from "../content/profile.ts";
import styles from "./posts.module.css";

// zod/mini keeps the full zod runtime out of the site shell; route schemas are small and tree-shakeable.
const search = z.object({ tag: z.optional(z.string()) });

export const Route = createFileRoute("/posts/")({
  validateSearch: search,
  component: PostsIndex,
  head: () => ({
    meta: [{ title: `Posts · ${siteProfile.name}` }, { name: "description", content: "Posts" }],
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
      {allTags.length > 0 && (
        <div className={styles.filters}>
          <TagList tags={allTags} />
          {tag && (
            <Link to="/posts" search={{}} className={styles.clear}>
              Clear filter
            </Link>
          )}
        </div>
      )}
      {shown.length === 0 ? (
        <p role="status">{tag ? `No posts tagged ‘${tag}’.` : "Nothing published yet."}</p>
      ) : (
        <Stack as="ol" gap="8" role="list" className={styles.list}>
          {shown.map((p) => (
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
      )}
    </Page>
  );
}
