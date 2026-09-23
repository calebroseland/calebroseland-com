import type { Profile } from "@crc/content-schema";
import type { GitHubClient } from "@crc/github-client";
import { mutationOptions } from "@tanstack/react-query";
import type { BufferController } from "../drafts/buffer.ts";
import { type ProfileSource, saveProfile } from "../profile.ts";
import { mergeAndCleanUp, openPr, type PullRequestInput } from "../publish/publish.ts";
import { editorKeys } from "./keys.ts";
import { beginEditing, createEntryDraft, discardEntry, type NewEntry, saveDraft } from "./ops.ts";

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
    mutationFn: async (mode: "save" | "overwrite") => {
      if (mode === "overwrite") {
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
    mutationFn: (input: Omit<PullRequestInput, "ref">) => openPr(gh, { ...input, ref }),
    meta: { invalidates: [editorKeys.drafts(), editorKeys.pull(ref)] },
  });

/** A merge changes what is published, so everything the editor has read is stale. */
export const mergeMutation = (gh: GitHubClient, ref: string) =>
  mutationOptions({
    mutationFn: (number: number) => mergeAndCleanUp(gh, { ref, number }),
    meta: { invalidates: [editorKeys.all] },
  });

export const saveProfileMutation = (gh: GitHubClient, source: ProfileSource) =>
  mutationOptions({
    mutationFn: (next: Profile) =>
      saveProfile(gh, source, next, "profile: edit from the landing card"),
    meta: { invalidates: listed },
  });
