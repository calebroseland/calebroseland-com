import type { Bundle, StaleRefError } from '@crc/github-client';
import { Stack } from '@crc/ui';
import { createFileRoute, Link } from '@tanstack/react-router';
import * as z from 'zod/mini';
import { ConfirmDialog } from '../editor/Dialogs.tsx';
import { useBeginEditing, useEntry, useReloadDraft, useSaveDraft } from '../editor/data/hooks.ts';
import { AssetsPanel } from '../editor/document/AssetsPanel.tsx';
import { Editor, useEditorApi } from '../editor/document/Editor.tsx';
import { MetaPanel } from '../editor/document/MetaPanel.tsx';
import { missingAlt } from '../editor/drafts/buffer.ts';
import { useDraftBuffer } from '../editor/drafts/hooks.ts';
import { addImage } from '../editor/drafts/images.ts';
import { useCapabilities, useGitHub } from '../editor/EditorProvider.tsx';
import { EditorShell } from '../editor/EditorShell.tsx';
import styles from '../editor/editor.module.css';
import { isAppHref } from '../editor/navigation.ts';
import { PublishDialog } from '../editor/publish/PublishDialog.tsx';
import { notify } from '../editor/Toast.tsx';
import { useDialogState } from '../hooks/useDialogState.ts';

type Panel = 'meta' | 'media';

export const Route = createFileRoute('/editor/$slug')({
  validateSearch: z.object({
    panel: z.optional(z.enum(['meta', 'media'])),
    // The page an edit was opened from, which Close returns to.
    from: z.optional(z.string()),
  }),
  head: ({ params }) => ({ meta: [{ title: `${params.slug} · Editor` }] }),
  component: DraftRoute,
});

function useSlug(): string {
  return Route.useParams().slug;
}

/** The side panel on show, kept in the URL. */
function usePanel() {
  const { panel = 'meta' } = Route.useSearch();
  const navigate = Route.useNavigate();
  return { panel, show: (next: Panel) => navigate({ search: (s) => ({ ...s, panel: next }) }) };
}

/** Where Close goes: back to the page the edit was opened from, or to the editor's list. */
function useClose() {
  const { from } = Route.useSearch();
  const navigate = Route.useNavigate();
  const href = isAppHref(from) ? from : '/editor';
  return { href, go: () => void navigate({ href }) };
}

function DraftRoute() {
  const slug = useSlug();
  const entry = useEntry(slug);
  switch (entry.status) {
    case 'loading':
      return (
        <EditorShell title={slug}>
          <p className={styles.muted} aria-busy="true">
            Loading…
          </p>
        </EditorShell>
      );
    case 'error':
      return (
        <EditorShell title={slug}>
          <p role="alert" className={styles.alert}>
            Couldn't load this entry from GitHub.{' '}
            <button type="button" className={styles.toastAction} onClick={entry.retry}>
              Retry
            </button>
          </p>
        </EditorShell>
      );
    case 'missing':
      return (
        <EditorShell title={slug}>
          <p role="alert" className={styles.alert}>
            No entry with the slug “{slug}” exists on {entry.ref}.
          </p>
          <p className={styles.muted}>
            <Link to="/editor">← Editor</Link>
          </p>
        </EditorShell>
      );
    case 'published':
      return <StartEditing slug={slug} />;
    case 'draft':
      // Keyed by ref only: a save advances the head, and remounting on that would rebuild the editor
      // from the pre-save cache and blank the body. Wholesale replacements are handled inside.
      return <DraftEditor key={entry.ref} slug={slug} bundle={entry.bundle} />;
  }
}

function StartEditing({ slug }: { slug: string }) {
  const gh = useGitHub();
  const begin = useBeginEditing();
  const start = async () => {
    const outcome = await begin.run(slug);
    if (!outcome.ok) {
      notify("Couldn't start editing this entry.", { kind: 'error' });
    }
  };
  return (
    <EditorShell title={slug}>
      <Stack gap="4">
        <p className={styles.muted}>
          This entry is published on <code>{gh.defaultBranch}</code>. Editing it starts a draft
          branch from there and reuses the existing bundle, so nothing is duplicated.
        </p>
        <div>
          <button
            type="button"
            className={styles.primary}
            onClick={start}
            disabled={begin.pending}
            aria-busy={begin.pending}
          >
            {begin.pending ? 'Starting…' : 'Edit this entry'}
          </button>
        </div>
      </Stack>
    </EditorShell>
  );
}

function DraftEditor({ slug, bundle }: { slug: string; bundle: Bundle }) {
  const { branches, publishes } = useCapabilities();
  const { panel, show } = usePanel();
  const close = useClose();
  const { buffer, controller, previewSrc } = useDraftBuffer(bundle, slug);
  const save = useSaveDraft(controller);
  const reload = useReloadDraft(controller, slug);
  const conflict = useDialogState<StaleRefError>();
  const api = useEditorApi();

  const runSave = async (mode: 'save' | 'overwrite') => {
    const outcome = await save.run(mode);
    if (outcome.ok) {
      if (branches) {
        const { commitUrl } = outcome.value;
        notify(`Committed to ${buffer.ref}`, {
          kind: 'success',
          action: {
            label: 'View commit',
            onClick: () => window.open(commitUrl, '_blank', 'noopener'),
          },
        });
      } else {
        notify(`Saved ${buffer.dir} to your working tree`, { kind: 'success' });
      }
    } else if (outcome.reason === 'conflict') {
      conflict.open(outcome.error);
    } else if (outcome.reason === 'expired') {
      notify('Your sign-in expired. Sign in again; your changes are kept on this device.', {
        kind: 'error',
      });
    } else {
      notify(
        branches
          ? "Couldn't save to GitHub. Your changes are still here."
          : "Couldn't write to your working tree. Your changes are still here.",
        { kind: 'error', action: { label: 'Retry', onClick: () => void runSave('save') } },
      );
    }
  };

  const onSave = () => {
    const missing = missingAlt(buffer);
    if (missing.length > 0) {
      notify(`Add alt text for ${missing.length} image${missing.length > 1 ? 's' : ''}.`, {
        kind: 'warning',
      });
      void show('media');
      return;
    }
    if (!buffer.meta.title.trim()) {
      notify('Add a title before saving.', { kind: 'warning' });
      void show('meta');
      return;
    }
    void runSave('save');
  };

  const reloadFromSource = async () => {
    conflict.close();
    const outcome = await reload.run();
    if (!outcome.ok) {
      notify("Couldn't load the current version.", { kind: 'error' });
    }
  };

  /* Alt text lives in two places by necessity: the buffer, which enforces it before a save, and the
     document, which is what becomes markdown. */
  const onAltChange = (name: string, alt: string) => {
    controller.setAlt(name, alt);
    api.current?.setImageAlt(name, alt);
  };

  const onImageFiles = async (files: File[]) => {
    for (const file of files) {
      const added = await addImage(controller, file);
      if (added.ok) {
        api.current?.insertImage(added.asset.name, '');
        void show('media');
      }
      // A file the editor cannot take is for the writer to fix; a failure to process it is ours.
      else {
        notify(added.reason === 'rejected' ? added.message : "Couldn't process that image.", {
          kind: added.reason === 'rejected' ? 'warning' : 'error',
        });
      }
    }
  };

  return (
    <EditorShell
      title={buffer.meta.title || slug}
      actions={
        <div className={styles.editorBar}>
          <span className={styles.status} data-dirty={buffer.dirty}>
            {save.pending ? 'Saving…' : buffer.dirty ? 'Unsaved changes' : 'Saved'}
          </span>
          <button
            type="button"
            className={styles.primary}
            onClick={onSave}
            disabled={!buffer.dirty || save.pending}
            aria-busy={save.pending}
          >
            {save.pending ? 'Saving…' : 'Save'}
          </button>
          {/* Nothing to publish in working-tree mode: the file is already on your branch. */}
          {publishes && <PublishDialog buffer={buffer} disabled={save.pending} />}
          {/* Unsaved work stays on this device and is restored when the entry is opened again. */}
          <a
            href={close.href}
            className={styles.secondary}
            onClick={(e) => {
              // A modified click opens a new tab as any link does.
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
                return;
              }
              e.preventDefault();
              if (buffer.dirty) {
                notify('Unsaved changes are kept on this device.');
              }
              close.go();
            }}
          >
            Close
          </a>
        </div>
      }
    >
      {buffer.restoredFromLocal && (
        <p role="status" className={styles.banner}>
          Restored unsaved changes from this device.
          {buffer.imagesDropped ? ' Images added but not saved were not kept.' : ''}
          <button type="button" className={styles.toastAction} onClick={reloadFromSource}>
            Discard local changes
          </button>
        </p>
      )}
      <p className={styles.muted}>
        <Link to="/editor">← Editor</Link>
      </p>
      <div className={styles.editorLayout}>
        <Editor
          key={reload.generation}
          initialMarkdown={buffer.markdown}
          onChange={controller.setMarkdown}
          onImageFiles={onImageFiles}
          previewSrc={previewSrc}
          apiRef={api}
        />
        <aside aria-label="Post details and images">
          <div className={styles.tabs} role="tablist" aria-label="Panel">
            {(['meta', 'media'] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                id={`tab-${p}`}
                aria-selected={panel === p}
                aria-controls={`panel-${p}`}
                className={styles.tab}
                onClick={() => show(p)}
              >
                {p === 'meta'
                  ? 'Details'
                  : `Images${buffer.assets.length > 0 ? ` (${buffer.assets.length})` : ''}`}
              </button>
            ))}
          </div>
          <div id={`panel-${panel}`} role="tabpanel" aria-labelledby={`tab-${panel}`}>
            {panel === 'meta' ? (
              <MetaPanel buffer={buffer} controller={controller} />
            ) : (
              <AssetsPanel buffer={buffer} controller={controller} onAltChange={onAltChange} />
            )}
          </div>
        </aside>
      </div>
      <ConfirmDialog
        open={conflict.isOpen}
        onOpenChange={conflict.onOpenChange}
        title={
          branches
            ? 'This post changed on GitHub since you opened it.'
            : 'This file changed on disk since you opened it.'
        }
        description={
          branches
            ? 'Reload to see the newer version (your local edits are discarded), or overwrite it with what you have here.'
            : 'Reload to see what is on disk now (your unsaved edits are discarded), or overwrite the file with what you have here.'
        }
        actions={
          <>
            <button type="button" className={styles.secondary} onClick={conflict.close}>
              Cancel
            </button>
            <button type="button" className={styles.secondary} onClick={reloadFromSource}>
              {branches ? 'Reload from GitHub' : 'Reload from disk'}
            </button>
            <button
              type="button"
              className={`${styles.primary} ${styles.danger}`}
              onClick={() => {
                conflict.close();
                void runSave('overwrite');
              }}
            >
              Overwrite
            </button>
          </>
        }
      />
    </EditorShell>
  );
}
