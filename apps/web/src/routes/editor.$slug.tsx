import { Alert, Button, button, ConfirmDialog, notify, Tabs } from '@crc/ui';
import { createFileRoute, Link } from '@tanstack/react-router';
import * as z from 'zod/mini';
import { isPlainClick } from '../dom.ts';
import { useEntry, useReloadEntry, useSaveEntry } from '../editor/data/hooks.ts';
import { AssetsPanel } from '../editor/document/AssetsPanel.tsx';
import { Editor, useEditorApi } from '../editor/document/Editor.tsx';
import { MetaPanel } from '../editor/document/MetaPanel.tsx';
import { missingAlt } from '../editor/drafts/buffer.ts';
import { useDraftBuffer } from '../editor/drafts/hooks.ts';
import { addImage } from '../editor/drafts/images.ts';
import { EditorShell } from '../editor/EditorShell.tsx';
import styles from '../editor/editor.module.css';
import { isAppHref } from '../editor/navigation.ts';
import type { ChangedOnDiskError, Tree } from '../editor/workingTree.ts';
import { useDialogState } from '../hooks/useDialogState.ts';
import { useTrackLoading } from '../loading/hooks.ts';

type Panel = 'meta' | 'media';

const useSlug = (): string => {
  return Route.useParams().slug;
};

/** The side panel on show, kept in the URL. Switching it stays where the reader is on the page. */
const usePanel = () => {
  const { panel = 'meta' } = Route.useSearch();
  const navigate = Route.useNavigate();
  return {
    panel,
    show: (next: Panel) => navigate({ search: (s) => ({ ...s, panel: next }), resetScroll: false }),
  };
};

/** Where Close goes: back to the page the edit was opened from, or to the editor's list. */
const useClose = () => {
  const { from } = Route.useSearch();
  const navigate = Route.useNavigate();
  const href = isAppHref(from) ? from : '/editor';
  return { href, go: () => void navigate({ href }) };
};

const DraftRoute = () => {
  const slug = useSlug();
  const entry = useEntry(slug);
  // The content tree arrives before the editor can show; the bar covers the wait.
  useTrackLoading(entry.status === 'loading');
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
          <Alert>
            Couldn't read this entry from your working tree.{' '}
            <Button variant="inline" onClick={entry.retry}>
              Retry
            </Button>
          </Alert>
        </EditorShell>
      );
    case 'missing':
      return (
        <EditorShell title={slug}>
          <Alert>No entry with the slug “{slug}” exists in your working tree.</Alert>
          <p className={styles.muted}>
            <Link to="/editor">← Editor</Link>
          </p>
        </EditorShell>
      );
    case 'ready':
      // Keyed by directory, never the head: a save advances the head, and remounting on that would
      // rebuild the editor from the pre-save cache and blank the body. Reloads are handled inside.
      return <DraftEditor key={entry.dir} slug={slug} tree={entry.tree} />;
  }
};

const saveStatus = (saving: boolean, dirty: boolean): string => {
  if (saving) {
    return 'Saving…';
  }
  return dirty ? 'Unsaved changes' : 'Saved';
};

const DraftEditor = ({ slug, tree }: { slug: string; tree: Tree }) => {
  const { panel, show } = usePanel();
  const close = useClose();
  const { buffer, controller, preview } = useDraftBuffer(tree, slug);
  const save = useSaveEntry(controller);
  const reload = useReloadEntry(controller, slug);
  const conflict = useDialogState<ChangedOnDiskError>();
  const api = useEditorApi();

  const runSave = async (mode: 'save' | 'overwrite') => {
    const outcome = await save.run(mode);
    if (outcome.ok) {
      notify(`Saved ${buffer.dir} to your working tree`, { kind: 'success' });
    } else if (outcome.reason === 'conflict') {
      conflict.open(outcome.error);
    } else {
      notify("Couldn't write to your working tree. Your changes are still here.", {
        kind: 'error',
        action: { label: 'Retry', onClick: () => void runSave('save') },
      });
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
      reading
      title={buffer.meta.title || slug}
      actions={
        <div className={styles.editorBar}>
          <span className={styles.status} data-dirty={buffer.dirty}>
            {saveStatus(save.pending, buffer.dirty)}
          </span>
          <Button
            variant="primary"
            onClick={onSave}
            disabled={!buffer.dirty}
            pending={save.pending}
          >
            {save.pending ? 'Saving…' : 'Save'}
          </Button>
          {/* Unsaved work stays on this device and is restored when the entry is opened again. */}
          <a
            href={close.href}
            className={button()}
            onClick={(e) => {
              // A modified click opens a new tab as any link does.
              if (!isPlainClick(e)) {
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
        <Alert tone="info">
          Restored unsaved changes from this device.
          {buffer.imagesDropped ? ' Images added but not saved were not kept.' : ''}
          <Button variant="inline" onClick={reloadFromSource}>
            Discard local changes
          </Button>
        </Alert>
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
          preview={preview}
          apiRef={api}
        />
        <aside aria-label="Post details and images">
          <Tabs
            label="Panel"
            value={panel}
            onValueChange={show}
            tabs={[
              {
                value: 'meta',
                label: 'Details',
                panel: <MetaPanel buffer={buffer} controller={controller} />,
              },
              {
                value: 'media',
                label: `Images${buffer.assets.length > 0 ? ` (${buffer.assets.length})` : ''}`,
                panel: (
                  <AssetsPanel buffer={buffer} controller={controller} onAltChange={onAltChange} />
                ),
              },
            ]}
          />
        </aside>
      </div>
      <ConfirmDialog
        open={conflict.isOpen}
        onOpenChange={conflict.onOpenChange}
        title="This file changed on disk since you opened it."
        description="Reload to see what is on disk now (your unsaved edits are discarded), or overwrite the file with what you have here."
        alternative={{ label: 'Reload from disk', onClick: reloadFromSource }}
        confirm={{
          label: 'Overwrite',
          tone: 'danger',
          onClick: () => {
            conflict.close();
            void runSave('overwrite');
          },
        }}
      />
    </EditorShell>
  );
};

export const Route = createFileRoute('/editor/$slug')({
  validateSearch: z.object({
    panel: z.optional(z.enum(['meta', 'media'])),
    // The page an edit was opened from, which Close returns to.
    from: z.optional(z.string()),
  }),
  head: ({ params }) => ({ meta: [{ title: `${params.slug} · Editor` }] }),
  component: DraftRoute,
});
