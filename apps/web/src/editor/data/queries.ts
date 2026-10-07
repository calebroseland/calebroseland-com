import type { GitHubClient } from '@crc/github-client';
import { queryOptions } from '@tanstack/react-query';
import { CONTENT_ROOT } from '../drafts/paths.ts';
import { entriesFromBundle } from '../entries.ts';
import { capabilitiesOf } from './backend.ts';
import { editorKeys } from './keys.ts';

/* Every read the editor makes, as query options. Hooks and loaders take these; nothing else builds a
   query key. */

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

/** The entries on the target branch, or on disk when the backend has no branches. */
export const publishedQuery = (gh: GitHubClient) =>
  queryOptions({
    queryKey: editorKeys.published(),
    queryFn: async () =>
      entriesFromBundle(
        await gh.readBundle(gh.defaultBranch, CONTENT_ROOT),
        capabilitiesOf(gh.kind).branches ? 'published' : 'working-tree',
      ),
    staleTime: 15_000,
  });

/** Everything under content/ on a branch: locates any entry's bundle, posts and pages alike. */
export const contentTreeQuery = (gh: GitHubClient, ref: string) =>
  queryOptions({
    queryKey: editorKeys.tree(ref),
    queryFn: () => gh.readBundle(ref, CONTENT_ROOT),
    staleTime: 10_000,
  });

export const pullQuery = (gh: GitHubClient, ref: string, opts: { poll?: boolean } = {}) =>
  queryOptions({
    queryKey: editorKeys.pull(ref),
    queryFn: () => gh.getPullRequest(ref),
    staleTime: 5_000,
    refetchInterval: opts.poll ? 15_000 : false,
  });
