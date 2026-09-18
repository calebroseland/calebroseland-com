import type { Post } from "@crc/content-schema";
import type { Draft, FileInput, GitHubClient } from "@crc/github-client";
import { serializeEntry } from "@crc/markdown";
import { type QueryClient, queryOptions } from "@tanstack/react-query";
import { type Buffer, dataUrlToBytes } from "../drafts/buffer.ts";
import { bundleDirFor, POSTS_ROOT } from "../drafts/paths.ts";
import { studioKeys } from "./queries.ts";

/** Everything under content/posts on a branch: used to locate a draft's bundle and to read it. */
export const postsTreeQuery = (gh: GitHubClient, ref: string) =>
  queryOptions({
    queryKey: studioKeys.bundle(ref, POSTS_ROOT),
    queryFn: () => gh.readBundle(ref, POSTS_ROOT),
    staleTime: 10_000,
  });

function toFrontmatter(meta: Buffer["meta"]): Post {
  return { ...meta, date: new Date(meta.date) };
}

function bundleFiles(b: Buffer): FileInput[] {
  const index: FileInput = {
    path: "index.md",
    content: serializeEntry({ meta: toFrontmatter(b.meta), body: b.markdown }),
  };
  const assets: FileInput[] = b.assets.map((a) => ({
    path: a.name,
    content: dataUrlToBytes(a.dataUrl),
  }));
  return [index, ...assets];
}

export async function createDraftWithBundle(
  gh: GitHubClient,
  input: { title: string; slug: string; date: Date },
): Promise<{ draft: Draft; dir: string; headSha: string }> {
  const draft = await gh.createDraft(input.slug);
  const dir = bundleDirFor(input.date, input.slug);
  const meta: Post = {
    kind: "post",
    title: input.title,
    slug: input.slug,
    date: input.date,
    draft: true,
    tags: [],
    placeholder: false,
  };
  const { headSha } = await gh.saveBundle({
    ref: draft.ref,
    dir,
    files: [{ path: "index.md", content: serializeEntry({ meta, body: "" }) }],
    message: `post: start "${input.title}"`,
    expectedHeadSha: draft.headSha,
  });
  return { draft, dir, headSha };
}

export async function saveDraft(
  gh: GitHubClient,
  b: Buffer,
): Promise<{ headSha: string; commitUrl: string }> {
  return gh.saveBundle({
    ref: b.ref,
    dir: b.dir,
    files: bundleFiles(b),
    message: `post: update "${b.meta.title}"`,
    expectedHeadSha: b.baseHeadSha,
  });
}

export async function invalidateDraft(queryClient: QueryClient, ref: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: studioKeys.drafts() }),
    queryClient.invalidateQueries({ queryKey: studioKeys.bundle(ref, POSTS_ROOT) }),
    queryClient.invalidateQueries({ queryKey: studioKeys.pull(ref) }),
  ]);
}
