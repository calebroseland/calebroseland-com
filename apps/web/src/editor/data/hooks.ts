import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { browserStorage } from '../../storage.ts';
import type { BufferController } from '../drafts/buffer.ts';
import { writeLocalBuffer } from '../drafts/buffer.ts';
import { type EntryKind, findEntryDir } from '../drafts/paths.ts';
import { type EditorEntry, entriesFromTree } from '../entries.ts';
import type { ProfileSource } from '../profile.ts';
import type { Tree } from '../workingTree.ts';
import { useCommand } from './command.ts';
import {
  createEntryMutation,
  deleteEntryMutation,
  reloadEntryMutation,
  saveEntryMutation,
  saveProfileMutation,
} from './mutations.ts';
import { branchQuery, treeQuery } from './queries.ts';

/* The editor's data, as hooks. Reads return a view the screen can switch on; writes return commands
   whose runs resolve to typed outcomes. What to say, and where to go next, stays with the screen. */

type Loadable<T> = { status: 'loading' } | { status: 'error'; retry: () => void } | T;

/** The branch checked out in the working tree. */
export const useBranch = (): string | undefined => {
  return useQuery(branchQuery()).data;
};

export type Board = Loadable<{
  status: 'ready';
  entries: EditorEntry[];
  counts: Record<'all' | EntryKind, number>;
}>;

/** Every entry on disk, narrowed to one kind. */
export const useBoard = (kind: EntryKind | undefined): Board => {
  const tree = useQuery(treeQuery());
  if (tree.isPending) {
    return { status: 'loading' };
  }
  if (tree.isError) {
    return { status: 'error', retry: () => void tree.refetch() };
  }
  const all = entriesFromTree(tree.data);
  return {
    status: 'ready',
    entries: kind ? all.filter((r) => r.kind === kind) : all,
    counts: {
      all: all.length,
      post: all.filter((r) => r.kind === 'post').length,
      page: all.filter((r) => r.kind === 'page').length,
    },
  };
};

export type EntryView = Loadable<
  { status: 'missing' } | { status: 'ready'; dir: string; tree: Tree }
>;

/** One entry by slug, with the tree it was read from. */
export const useEntry = (slug: string): EntryView => {
  const tree = useQuery(treeQuery());
  if (tree.isPending) {
    return { status: 'loading' };
  }
  if (tree.isError) {
    return { status: 'error', retry: () => void tree.refetch() };
  }
  const found = findEntryDir(
    tree.data.files.map((f) => f.path),
    slug,
  );
  return found ? { status: 'ready', dir: found.dir, tree: tree.data } : { status: 'missing' };
};

export const useCreateEntry = () => useCommand(createEntryMutation());

export const useDeleteEntry = () => useCommand(deleteEntryMutation());

/** Writes the buffer; on success the buffer takes the new head and its local copy is cleared. */
export const useSaveEntry = (controller: BufferController) => {
  return useCommand({
    ...saveEntryMutation(controller),
    onSuccess: ({ headSha }) => {
      controller.markSaved(headSha);
      writeLocalBuffer(controller.store.state, browserStorage('local'));
    },
  });
};

/** Replaces the buffer with what is on disk. `generation` changes with each reload, for views that
    read the buffer only once (the document editor). */
export const useReloadEntry = (controller: BufferController, slug: string) => {
  const [generation, setGeneration] = useState(0);
  const command = useCommand({
    ...reloadEntryMutation(controller, slug),
    onSuccess: () => setGeneration((g) => g + 1),
  });
  return { ...command, generation };
};

export const useSaveProfile = (source: ProfileSource) => useCommand(saveProfileMutation(source));
