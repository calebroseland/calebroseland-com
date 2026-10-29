import { queryOptions } from '@tanstack/react-query';
import { readBranch, readTree } from '../workingTree.ts';

/* Typed query-key factory for everything the editor caches. Every key sits under ["editor"]. */
export const editorKeys = {
  all: ['editor'] as const,
  branch: () => [...editorKeys.all, 'branch'] as const,
  /** Everything under content/ in the working tree. */
  tree: () => [...editorKeys.all, 'tree'] as const,
};

/* Every read the editor makes, as query options. Hooks and loaders take these; nothing else builds a
   query key. */

export const branchQuery = () =>
  queryOptions({
    queryKey: editorKeys.branch(),
    queryFn: readBranch,
    staleTime: 5 * 60_000,
  });

/** Everything under content/: locates any entry's files, posts and pages alike. */
export const treeQuery = () =>
  queryOptions({
    queryKey: editorKeys.tree(),
    queryFn: readTree,
    staleTime: 10_000,
  });
