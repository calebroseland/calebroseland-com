import type { GitHubClient } from "@crc/github-client";
import { queryOptions } from "@tanstack/react-query";

/* Typed query-key factory. Invalidation is by ref: anything under ["studio", "drafts"] after a write. */
export const studioKeys = {
  all: ["studio"] as const,
  viewer: () => [...studioKeys.all, "viewer"] as const,
  drafts: () => [...studioKeys.all, "drafts"] as const,
  bundle: (ref: string, dir: string) => [...studioKeys.all, "bundle", ref, dir] as const,
  pull: (ref: string) => [...studioKeys.all, "pull", ref] as const,
};

export const viewerQuery = (gh: GitHubClient) =>
  queryOptions({
    queryKey: studioKeys.viewer(),
    queryFn: () => gh.getViewer(),
    staleTime: 5 * 60_000,
  });

export const draftsQuery = (gh: GitHubClient) =>
  queryOptions({
    queryKey: studioKeys.drafts(),
    queryFn: () => gh.listDrafts(),
    staleTime: 15_000,
  });
