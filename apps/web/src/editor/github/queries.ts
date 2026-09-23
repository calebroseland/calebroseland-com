import type { GitHubClient } from "@crc/github-client";
import { queryOptions } from "@tanstack/react-query";

/* Typed query-key factory. Invalidation is by ref: anything under ["editor", "drafts"] after a write. */
export const editorKeys = {
  all: ["editor"] as const,
  viewer: () => [...editorKeys.all, "viewer"] as const,
  drafts: () => [...editorKeys.all, "drafts"] as const,
  bundle: (ref: string, dir: string) => [...editorKeys.all, "bundle", ref, dir] as const,
  pull: (ref: string) => [...editorKeys.all, "pull", ref] as const,
  published: () => [...editorKeys.all, "published"] as const,
};

export const viewerQuery = (gh: GitHubClient) =>
  queryOptions({
    queryKey: editorKeys.viewer(),
    queryFn: () => gh.getViewer(),
    staleTime: 5 * 60_000,
  });

export const draftsQuery = (gh: GitHubClient) =>
  queryOptions({
    queryKey: editorKeys.drafts(),
    queryFn: () => gh.listDrafts(),
    staleTime: 15_000,
  });
