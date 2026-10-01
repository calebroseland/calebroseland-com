import type { Bundle } from "@crc/github-client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { BufferController } from "../drafts/buffer.ts";
import { browserStorage, writeLocalBuffer } from "../drafts/buffer.ts";
import { type EntryKind, findEntryDir } from "../drafts/paths.ts";
import { useCapabilities, useGitHub } from "../EditorProvider.tsx";
import { type EditorEntry, mergeEntries } from "../entries.ts";
import type { ProfileSource } from "../profile.ts";
import { type PublishState, publishState } from "../publish/publish.ts";
import { useCommand } from "./command.ts";
import {
  beginEditingMutation,
  createEntryMutation,
  discardEntryMutation,
  mergeMutation,
  openPullRequestMutation,
  reloadDraftMutation,
  saveDraftMutation,
  saveProfileMutation,
} from "./mutations.ts";
import {
  contentTreeQuery,
  draftsQuery,
  publishedQuery,
  pullQuery,
  viewerQuery,
} from "./queries.ts";

/* The editor's data, as hooks. Reads return a view the screen can switch on; writes return commands
   whose runs resolve to typed outcomes. What to say, and where to go next, stays with the screen. */

type Loadable<T> = { status: "loading" } | { status: "error"; retry: () => void } | T;

/** The signed-in account's name, or the checked-out branch in working-tree mode. */
export function useViewerLogin(): string | undefined {
  return useQuery(viewerQuery(useGitHub())).data?.login;
}

export type Board = Loadable<{
  status: "ready";
  inProgress: EditorEntry[];
  live: EditorEntry[];
  counts: Record<"all" | EntryKind, number>;
}>;

/** Everything the editor can open, draft branches over published entries, narrowed to one kind. */
export function useBoard(kind: EntryKind | undefined): Board {
  const gh = useGitHub();
  const { branches } = useCapabilities();
  // Without branches the entries on disk are the whole story; there are no drafts to lay over them.
  const drafts = useQuery({ ...draftsQuery(gh), enabled: branches });
  const published = useQuery(publishedQuery(gh));
  if ((branches && drafts.isPending) || published.isPending) return { status: "loading" };
  if (drafts.isError || published.isError)
    return {
      status: "error",
      retry: () => {
        void drafts.refetch();
        void published.refetch();
      },
    };
  const all = branches ? mergeEntries(published.data, drafts.data ?? []) : published.data;
  const rows = kind ? all.filter((r) => r.kind === kind) : all;
  return {
    status: "ready",
    inProgress: rows.filter((r) => r.status === "draft" || r.status === "pull-request"),
    live: rows.filter((r) => r.status === "published" || r.status === "working-tree"),
    counts: {
      all: all.length,
      post: all.filter((r) => r.kind === "post").length,
      page: all.filter((r) => r.kind === "page").length,
    },
  };
}

export type EntryView = Loadable<
  | { status: "missing"; ref: string }
  /** On the target branch with no draft of its own: editing starts one. */
  | { status: "published"; ref: string }
  | { status: "draft"; ref: string; bundle: Bundle }
>;

/** One entry by slug: read from its draft branch when it has one, otherwise from the target branch. */
export function useEntry(slug: string): EntryView {
  const gh = useGitHub();
  const drafts = useQuery(draftsQuery(gh));
  const draft = drafts.data?.find((d) => d.slug === slug);
  const ref = draft?.ref ?? gh.defaultBranch;
  const tree = useQuery({ ...contentTreeQuery(gh, ref), enabled: drafts.isSuccess });
  if (drafts.isPending || tree.isPending) return { status: "loading" };
  if (drafts.isError || tree.isError)
    return {
      status: "error",
      retry: () => {
        void drafts.refetch();
        void tree.refetch();
      },
    };
  const paths = tree.data.files.map((f) => f.path);
  if (!findEntryDir(paths, slug)) return { status: "missing", ref };
  return draft ? { status: "draft", ref, bundle: tree.data } : { status: "published", ref };
}

export const useCreateEntry = () => useCommand(createEntryMutation(useGitHub()));

export const useBeginEditing = () => useCommand(beginEditingMutation(useGitHub()));

export const useDiscardEntry = () => useCommand(discardEntryMutation(useGitHub()));

/** Commits the buffer; on success the buffer takes the new head and its local copy is cleared. */
export function useSaveDraft(controller: BufferController) {
  return useCommand({
    ...saveDraftMutation(useGitHub(), controller),
    onSuccess: ({ headSha }) => {
      controller.markSaved(headSha);
      writeLocalBuffer(controller.store.state, browserStorage());
    },
  });
}

/** Replaces the buffer with the branch's current version. `generation` changes with each reload, for
    views that read the buffer only once (the document editor). */
export function useReloadDraft(controller: BufferController, slug: string) {
  const [generation, setGeneration] = useState(0);
  const command = useCommand({
    ...reloadDraftMutation(useGitHub(), controller, slug),
    onSuccess: () => setGeneration((g) => g + 1),
  });
  return { ...command, generation };
}

/** Where a draft stands on the way to publication; polls while `watching`. */
export function usePublishState(
  ref: string,
  watching: boolean,
): PublishState & { checking: boolean } {
  const pull = useQuery({ ...pullQuery(useGitHub(), ref, { poll: watching }), enabled: watching });
  return { ...publishState(pull.data ?? null), checking: watching && pull.isPending };
}

export const useOpenPullRequest = (ref: string) =>
  useCommand(openPullRequestMutation(useGitHub(), ref));

/** Merges the pull request and waits for the deploy. `stage` is "deploying" while it waits and "slow"
    when the deploy did not show up in time. */
export function useMergeAndDeploy(ref: string) {
  const [stage, setStage] = useState<"idle" | "deploying" | "slow">("idle");
  const command = useCommand({
    ...mergeMutation(useGitHub(), ref, () => setStage("deploying")),
    onSuccess: ({ deployed }) => setStage(deployed ? "idle" : "slow"),
    onError: () => setStage("idle"),
  });
  return { ...command, stage };
}

export const useSaveProfile = (source: ProfileSource) =>
  useCommand(saveProfileMutation(useGitHub(), source));
