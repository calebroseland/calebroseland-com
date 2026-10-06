import { Stack } from '@crc/ui';
import { createFileRoute } from '@tanstack/react-router';
import * as z from 'zod/mini';
import { useCreateEntry } from '../editor/data/hooks.ts';
import { useNewEntryForm } from '../editor/drafts/newEntry.ts';
import type { EntryKind } from '../editor/drafts/paths.ts';
import { EditorShell } from '../editor/EditorShell.tsx';
import styles from '../editor/editor.module.css';
import { useOpenInEditor } from '../editor/navigation.ts';

export const Route = createFileRoute('/editor/new')({
  validateSearch: z.object({ kind: z.optional(z.enum(['post', 'page'])) }),
  head: () => ({ meta: [{ title: 'New entry · Editor' }] }),
  component: NewEntry,
});

/** The kind asked for in the URL (the board's New page link asks for a page). */
function useRequestedKind(): EntryKind {
  return Route.useSearch().kind ?? 'post';
}

function NewEntry() {
  const form = useNewEntryForm(useRequestedKind());
  const { kind, title, slugOk, date } = form;
  const effectiveSlug = form.slug;
  const create = useCreateEntry();
  const openInEditor = useOpenInEditor();

  const submit = async () => {
    if (!form.entry) return;
    const outcome = await create.run(form.entry);
    if (outcome.ok) await openInEditor(outcome.value.draft.slug);
  };

  return (
    <EditorShell title="New entry">
      <form
        className={styles.panel}
        style={{ maxInlineSize: '32rem' }}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        aria-busy={create.pending}
      >
        <Stack gap="4">
          <fieldset className={styles.fieldset}>
            <legend>Kind</legend>
            {(['post', 'page'] as const).map((k) => (
              <label key={k} className={styles.check}>
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => form.setKind(k)}
                />
                <span>
                  {k === 'post'
                    ? 'Post — dated, listed under Posts'
                    : 'Page — standalone, at its own address'}
                </span>
              </label>
            ))}
          </fieldset>
          <div className={styles.field}>
            <label htmlFor="new-title">Title</label>
            <input
              id="new-title"
              className={styles.input}
              value={title}
              onChange={(e) => form.setTitle(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="new-slug">Slug</label>
            <input
              id="new-slug"
              className={styles.input}
              value={effectiveSlug}
              onChange={(e) => form.setSlug(e.target.value)}
              aria-invalid={effectiveSlug.length > 0 && !slugOk}
              aria-describedby="new-slug-hint"
            />
            <small
              id="new-slug-hint"
              className={effectiveSlug && !slugOk ? styles.fieldError : styles.muted}
            >
              {effectiveSlug && !slugOk
                ? 'Lowercase words separated by single hyphens.'
                : 'Fixed after the first save.'}
            </small>
          </div>
          {kind === 'post' && (
            <div className={styles.field}>
              <label htmlFor="new-date">Date</label>
              <input
                id="new-date"
                type="date"
                className={styles.input}
                value={date}
                onChange={(e) => form.setDate(e.target.value)}
              />
            </div>
          )}
          {create.failure && (
            <p role="alert" className={styles.alert}>
              Couldn't create it:{' '}
              {create.failure.error instanceof Error
                ? create.failure.error.message
                : 'unknown error'}
            </p>
          )}
          <div>
            <button
              type="submit"
              className={styles.primary}
              disabled={!form.entry || create.pending}
            >
              {create.pending ? 'Creating…' : `Create ${kind}`}
            </button>
          </div>
        </Stack>
      </form>
    </EditorShell>
  );
}
