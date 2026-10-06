import type { Profile } from '@crc/content-schema';
import type { GitHubClient } from '@crc/github-client';
import { mutationOptions } from '@tanstack/react-query';
import { type BufferController, browserStorage, writeLocalBuffer } from '../drafts/buffer.ts';
import { bufferFromBundle } from '../drafts/load.ts';
import { type ProfileSource, saveProfile } from '../profile.ts';
import {
  mergeAndCleanUp,
  openPr,
  type PullRequestInput,
  waitForDeploy,
} from '../publish/publish.ts';
import { capabilitiesOf } from './backend.ts';
import { editorKeys } from './keys.ts';
import { beginEditing, createEntryDraft, discardEntry, type NewEntry, saveDraft } from './ops.ts';

/* Every write the editor makes, as mutation options that declare what they make stale. The query
   client refreshes those before a caller's own onSuccess runs, so a caller can navigate straight to
   fresh data. Callers add only what the screen does next. */

const listed = [editorKeys.drafts(), editorKeys.published()] as const;

export const createEntryMutation = (gh: GitHubClient) =>
  mutationOptions({
    mutationFn: (input: NewEntry) => createEntryDraft(gh, input),
    meta: { invalidates: listed },
  });

export const beginEditingMutation = (gh: GitHubClient) =>
  mutationOptions({
    mutationFn: (slug: string) => beginEditing(gh, slug),
    meta: { invalidates: listed },
  });

export const discardEntryMutation = (gh: GitHubClient) =>
  mutationOptions({
    mutationFn: (row: { ref: string; dir: string }) => discardEntry(gh, row),
    meta: { invalidates: listed },
  });

/** Saves the buffer; "overwrite" first takes the branch's current head, replacing what is there. */
export const saveDraftMutation = (gh: GitHubClient, controller: BufferController) => {
  const { ref } = controller.store.state;
  return mutationOptions({
    mutationFn: async (mode: 'save' | 'overwrite') => {
      if (mode === 'overwrite') {
        const b = controller.store.state;
        controller.rebase((await gh.readBundle(b.ref, b.dir)).headSha);
      }
      return saveDraft(gh, controller.store.state);
    },
    meta: { invalidates: [...listed, editorKeys.tree(ref)] },
  });
};

export const openPullRequestMutation = (gh: GitHubClient, ref: string) =>
  mutationOptions({
    mutationFn: (input: Omit<PullRequestInput, 'ref'>) => openPr(gh, { ...input, ref }),
    meta: { invalidates: [editorKeys.drafts(), editorKeys.pull(ref)] },
  });

/** Throws away the local copy and loads the branch's current version as the new base. */
export const reloadDraftMutation = (
  gh: GitHubClient,
  controller: BufferController,
  slug: string,
) => {
  const { ref } = controller.store.state;
  return mutationOptions({
    mutationFn: async () => {
      const b = controller.store.state;
      // A clean buffer removes its local copy.
      writeLocalBuffer({ ...b, dirty: false }, browserStorage());
      controller.replace(bufferFromBundle(await gh.readBundle(b.ref, b.dir), slug));
    },
    meta: { invalidates: [editorKeys.tree(ref)] },
  });
};

/** Merges, then waits for the deploy where there is one. A merge changes what is published, so
    everything the editor has read is stale. */
export const mergeMutation = (
  gh: GitHubClient,
  ref: string,
  onDeploying: () => void = () => undefined,
) =>
  mutationOptions({
    mutationFn: async (number: number) => {
      const merged = await mergeAndCleanUp(gh, { ref, number });
      if (!capabilitiesOf(gh.kind).deploys) return { deployed: true };
      onDeploying();
      const deployed = await waitForDeploy({
        healthUrl: `${window.location.origin}/api/health`,
        sha: merged.sha,
      });
      return { deployed };
    },
    meta: { invalidates: [editorKeys.all] },
  });

export const saveProfileMutation = (gh: GitHubClient, source: ProfileSource) =>
  mutationOptions({
    mutationFn: (next: Profile) =>
      saveProfile(gh, source, next, 'profile: edit from the landing card'),
    meta: { invalidates: listed },
  });
