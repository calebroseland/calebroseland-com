import { Dialog } from '@base-ui/react/dialog';
import { useDisclosure } from '../../hooks/useDisclosure.ts';
import { useMergeAndDeploy, useOpenPullRequest, usePublishState } from '../data/hooks.ts';
import type { Buffer } from '../drafts/buffer.ts';
import { useGitHub } from '../EditorProvider.tsx';
import styles from '../editor.module.css';
import { useShowLive } from '../navigation.ts';
import { notify } from '../Toast.tsx';

/* States follow UX-SPEC §3.5: pre-flight → PR open (checks) → mergeable → merging → deploying → done, plus conflict. */

export function PublishDialog({ buffer, disabled }: { buffer: Buffer; disabled?: boolean }) {
  const gh = useGitHub();
  const dialog = useDisclosure();
  const state = usePublishState(buffer.ref, dialog.open);
  const openPr = useOpenPullRequest(buffer.ref);
  const merge = useMergeAndDeploy(buffer.ref);
  const showLive = useShowLive();

  const open = async () => {
    const outcome = await openPr.run({
      title: buffer.meta.title,
      summary: buffer.meta.summary,
      slug: buffer.meta.slug,
    });
    if (!outcome.ok) {
      notify("Couldn't open the pull request.", { kind: 'error' });
    }
  };

  const mergeAndShow = async (number: number) => {
    const outcome = await merge.run(number);
    if (!outcome.ok) {
      notify("Merge didn't complete. Check the pull request on GitHub.", { kind: 'error' });
      return;
    }
    if (!outcome.value.deployed) {
      return;
    }
    notify('Published.', { kind: 'success' });
    dialog.setOpen(false);
    await showLive(buffer.meta);
  };

  const busy = openPr.pending || merge.pending;

  return (
    <Dialog.Root open={dialog.open} onOpenChange={(o) => !busy && dialog.setOpen(o)}>
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
            {state.checking && <span>Checking for a pull request…</span>}
            {state.kind === 'open' && (
              <span>
                <a href={state.pr.url} target="_blank" rel="noopener noreferrer">
                  Pull request #{state.pr.number}
                </a>{' '}
                {state.mergeable === null ? 'opened. Checks running…' : 'is ready to merge.'}
              </span>
            )}
            {state.kind === 'conflict' && (
              <span>
                This draft can't be merged automatically because {gh.defaultBranch} changed.{' '}
                <a href={state.pr.url} target="_blank" rel="noopener noreferrer">
                  Resolve on GitHub.
                </a>
              </span>
            )}
            {merge.stage === 'deploying' && <span>Published. Deploying…</span>}
            {merge.stage === 'slow' && (
              <span>Deploy is taking longer than usual. Check Actions.</span>
            )}
          </div>

          <div className={styles.dialogActions}>
            <Dialog.Close className={styles.secondary} disabled={busy}>
              {state.kind === 'none' ? 'Cancel' : 'Close'}
            </Dialog.Close>
            {state.kind === 'none' && (
              <button
                type="button"
                className={styles.primary}
                onClick={open}
                disabled={busy || buffer.dirty}
              >
                {openPr.pending ? 'Opening…' : 'Open pull request'}
              </button>
            )}
            {state.kind === 'open' && (
              <button
                type="button"
                className={styles.primary}
                onClick={() => void mergeAndShow(state.pr.number)}
                disabled={busy || state.mergeable !== true}
                title={state.mergeable !== true ? 'Waiting for checks' : undefined}
              >
                {merge.pending
                  ? merge.stage === 'deploying'
                    ? 'Deploying…'
                    : 'Merging…'
                  : 'Merge and publish'}
              </button>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
