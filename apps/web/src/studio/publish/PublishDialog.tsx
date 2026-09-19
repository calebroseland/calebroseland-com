import { Dialog } from "@base-ui/react/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { Buffer } from "../drafts/buffer.ts";
import { useGitHub } from "../StudioProvider.tsx";
import styles from "../studio.module.css";
import { notify } from "../Toast.tsx";
import { mergeAndCleanUp, openPr, publishState, pullQuery, waitForDeploy } from "./publish.ts";

/* States follow UX-SPEC §3.5: pre-flight → PR open (checks) → mergeable → merging → deploying → done, plus conflict. */

export function PublishDialog({ buffer, disabled }: { buffer: Buffer; disabled?: boolean }) {
  const gh = useGitHub();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"idle" | "deploying" | "slow">("idle");
  const pull = useQuery({ ...pullQuery(gh, buffer.ref, { poll: open }), enabled: open });
  const state = publishState(pull.data ?? null);

  const openMutation = useMutation({
    mutationFn: () =>
      openPr(gh, queryClient, {
        ref: buffer.ref,
        title: buffer.meta.title,
        summary: buffer.meta.summary,
        slug: buffer.meta.slug,
      }),
    onError: () => notify("Couldn't open the pull request.", { kind: "alert" }),
  });

  const merge = useMutation({
    mutationFn: async (number: number) => {
      const merged = await mergeAndCleanUp(gh, queryClient, { ref: buffer.ref, number });
      if (gh.kind === "fake") return { merged, deployed: true };
      setPhase("deploying");
      const deployed = await waitForDeploy({
        healthUrl: `${window.location.origin}/api/health`,
        sha: merged.sha,
      });
      return { merged, deployed };
    },
    onSuccess: async ({ deployed }) => {
      if (deployed) {
        notify("Published.");
        setOpen(false);
        await navigate({ to: "/posts/$slug", params: { slug: buffer.meta.slug } });
      } else {
        setPhase("slow");
      }
    },
    onError: () =>
      notify("Merge didn't complete. Check the pull request on GitHub.", { kind: "alert" }),
  });

  const busy = openMutation.isPending || merge.isPending;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <Dialog.Trigger className={styles.secondary} disabled={disabled}>
        Publish
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Popup className={styles.dialog} aria-busy={busy}>
          <Dialog.Title className={styles.dialogTitle}>Publish “{buffer.meta.title}”</Dialog.Title>
          <Dialog.Description className={styles.dialogBody} render={<div />}>
            <dl className={styles.summaryList}>
              <dt>Slug</dt>
              <dd>
                <code>{buffer.meta.slug}</code>
              </dd>
              <dt>Date</dt>
              <dd>{buffer.meta.date}</dd>
              {buffer.meta.summary && (
                <>
                  <dt>Summary</dt>
                  <dd>{buffer.meta.summary}</dd>
                </>
              )}
            </dl>
            {buffer.meta.draft && (
              <p className={styles.alert}>
                This post is marked draft and won't appear on the site. Publish anyway?
              </p>
            )}
            {buffer.dirty && (
              <p className={styles.alert}>
                You have unsaved changes. Save first so they are included.
              </p>
            )}
          </Dialog.Description>

          <div role="status" aria-live="polite" className={styles.prStatus}>
            {pull.isPending && open && <span>Checking for a pull request…</span>}
            {state.kind === "open" && (
              <span>
                <a href={state.pr.url} target="_blank" rel="noopener noreferrer">
                  Pull request #{state.pr.number}
                </a>{" "}
                {state.mergeable === null ? "opened. Checks running…" : "is ready to merge."}
              </span>
            )}
            {state.kind === "conflict" && (
              <span>
                This draft can't be merged automatically because master changed.{" "}
                <a href={state.pr.url} target="_blank" rel="noopener noreferrer">
                  Resolve on GitHub.
                </a>
              </span>
            )}
            {phase === "deploying" && <span>Published. Deploying…</span>}
            {phase === "slow" && <span>Deploy is taking longer than usual. Check Actions.</span>}
          </div>

          <div className={styles.dialogActions}>
            <Dialog.Close className={styles.secondary} disabled={busy}>
              {state.kind === "none" ? "Cancel" : "Close"}
            </Dialog.Close>
            {state.kind === "none" && (
              <button
                type="button"
                className={styles.primary}
                onClick={() => openMutation.mutate()}
                disabled={busy || buffer.dirty}
              >
                {openMutation.isPending ? "Opening…" : "Open pull request"}
              </button>
            )}
            {state.kind === "open" && (
              <button
                type="button"
                className={styles.primary}
                onClick={() => merge.mutate(state.pr.number)}
                disabled={busy || state.mergeable !== true}
                title={state.mergeable !== true ? "Waiting for checks" : undefined}
              >
                {merge.isPending
                  ? phase === "deploying"
                    ? "Deploying…"
                    : "Merging…"
                  : "Merge and publish"}
              </button>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
