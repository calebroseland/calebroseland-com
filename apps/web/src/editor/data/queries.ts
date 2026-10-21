import { queryOptions } from '@tanstack/react-query';
import { readBranch, readTree } from '../workingTree.ts';
import { editorKeys } from './keys.ts';

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
