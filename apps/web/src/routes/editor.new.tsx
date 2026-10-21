import { Alert, Button, RadioGroup, Stack, TextField } from '@crc/ui';
import { createFileRoute } from '@tanstack/react-router';
import * as z from 'zod/mini';
import { useCreateEntry } from '../editor/data/hooks.ts';
import { useNewEntryForm } from '../editor/drafts/newEntry.ts';
import type { EntryKind } from '../editor/drafts/paths.ts';
import { EditorShell } from '../editor/EditorShell.tsx';
import styles from '../editor/editor.module.css';
import { useOpenInEditor } from '../editor/navigation.ts';

/** The kind asked for in the URL (the board's New page link asks for a page). */
const useRequestedKind = (): EntryKind => {
  return Route.useSearch().kind ?? 'post';
};

const KINDS = [
  { value: 'post', label: 'Post — dated, listed under Posts' },
  { value: 'page', label: 'Page — standalone, at its own address' },
] as const;

const NewEntry = () => {
  const form = useNewEntryForm(useRequestedKind());
  const { kind, title, slugOk, date } = form;
  const effectiveSlug = form.slug;
  const create = useCreateEntry();
  const openInEditor = useOpenInEditor();

  const submit = async () => {
    if (!form.entry) {
      return;
    }
    const outcome = await create.run(form.entry);
    if (outcome.ok) {
      await openInEditor(outcome.value.slug);
    }
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
          <RadioGroup legend="Kind" value={kind} options={KINDS} onValueChange={form.setKind} />
          <TextField label="Title" value={title} onValueChange={form.setTitle} required />
          <TextField
            label="Slug"
            value={effectiveSlug}
            onValueChange={form.setSlug}
            error={effectiveSlug && !slugOk ? 'Lowercase words separated by single hyphens.' : null}
            description="Fixed after the first save."
          />
          {kind === 'post' && (
            <TextField label="Date" type="date" value={date} onValueChange={form.setDate} />
          )}
          {create.failure && (
            <Alert>
              Couldn't create it:{' '}
              {create.failure.error instanceof Error
                ? create.failure.error.message
                : 'unknown error'}
            </Alert>
          )}
          <div>
            <Button type="submit" variant="primary" disabled={!form.entry} pending={create.pending}>
              {create.pending ? 'Creating…' : `Create ${kind}`}
            </Button>
          </div>
        </Stack>
      </form>
    </EditorShell>
  );
};

export const Route = createFileRoute('/editor/new')({
  validateSearch: z.object({ kind: z.optional(z.enum(['post', 'page'])) }),
  head: () => ({ meta: [{ title: 'New entry · Editor' }] }),
  component: NewEntry,
});
