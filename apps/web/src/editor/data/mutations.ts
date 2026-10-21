import type { Profile } from '@crc/content-schema';
import { mutationOptions } from '@tanstack/react-query';
import { browserStorage } from '../../storage.ts';
import { type BufferController, writeLocalBuffer } from '../drafts/buffer.ts';
import { bufferFromTree } from '../drafts/load.ts';
import { type ProfileSource, saveProfile } from '../profile.ts';
import { readTree } from '../workingTree.ts';
import { editorKeys } from './keys.ts';
import { createEntry, deleteEntry, type NewEntry, saveEntry } from './ops.ts';

/* Every write the editor makes, as mutation options that declare what they make stale. The query
   client refreshes those before a caller's own onSuccess runs, so a caller can navigate straight to
   fresh data. Callers add only what the screen does next. */

const written = [editorKeys.tree()] as const;

export const createEntryMutation = () =>
  mutationOptions({
    mutationFn: (input: NewEntry) => createEntry(input),
    meta: { invalidates: written },
  });

export const deleteEntryMutation = () =>
  mutationOptions({
    mutationFn: (dir: string) => deleteEntry(dir, browserStorage('local')),
    meta: { invalidates: written },
  });

/** Saves the buffer; "overwrite" first takes the tree's current head, replacing what is on disk. */
export const saveEntryMutation = (controller: BufferController) =>
  mutationOptions({
    mutationFn: async (mode: 'save' | 'overwrite') => {
      if (mode === 'overwrite') {
        controller.rebase((await readTree()).headSha);
      }
      return saveEntry(controller.store.state);
    },
    meta: { invalidates: written },
  });

/** Throws away the local copy and loads what is on disk as the new base. */
export const reloadEntryMutation = (controller: BufferController, slug: string) =>
  mutationOptions({
    mutationFn: async () => {
      // A clean buffer removes its local copy.
      writeLocalBuffer({ ...controller.store.state, dirty: false }, browserStorage('local'));
      controller.replace(bufferFromTree(await readTree(), slug));
    },
    meta: { invalidates: written },
  });

export const saveProfileMutation = (source: ProfileSource) =>
  mutationOptions({
    mutationFn: (next: Profile) => saveProfile(source, next),
    meta: { invalidates: written },
  });
