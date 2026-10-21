import {
  Button,
  button,
  ConfirmDialog,
  Icon,
  iconButton,
  Menu,
  MenuItem,
  notify,
  Stack,
} from '@crc/ui';
import { createFileRoute, Link } from '@tanstack/react-router';
import * as z from 'zod/mini';
import { useBoard, useBranch, useDeleteEntry } from '../editor/data/hooks.ts';
import type { EntryKind } from '../editor/drafts/paths.ts';
import { EditorShell } from '../editor/EditorShell.tsx';
import styles from '../editor/editor.module.css';
import type { EditorEntry } from '../editor/entries.ts';
import { useDialogState } from '../hooks/useDialogState.ts';

const EMPTY = { page: 'No pages yet.', post: 'No posts yet.' } as const;

const FILTERS = [
  { label: 'All', kind: undefined },
  { label: 'Posts', kind: 'post' },
  { label: 'Pages', kind: 'page' },
] as const;

const NEW_LABEL = { post: 'New post', page: 'New page' } as const;

/** The kind the board is narrowed to, kept in the URL so a view can be linked to. */
const useKindFilter = (): EntryKind | undefined => {
  return Route.useSearch().kind;
};

const Board = () => {
  const kind = useKindFilter();
  const board = useBoard(kind);
  const branch = useBranch();
  const deleting = useDialogState<EditorEntry>();
  const remove = useDeleteEntry();

  const runDelete = async (entry: EditorEntry) => {
    const outcome = await remove.run(entry.dir);
    if (outcome.ok) {
      notify('Deleted from your working tree', { kind: 'success' });
    } else {
      notify("Couldn't delete that.", { kind: 'error' });
    }
  };

  const ready = board.status === 'ready' ? board : null;
  const target = deleting.subject;

  return (
    <EditorShell
      actions={
        <Link
          to="/editor/new"
          search={kind ? { kind } : {}}
          className={button({ variant: 'primary' })}
        >
          {kind ? NEW_LABEL[kind] : 'New entry'}
        </Link>
      }
    >
      <p className={styles.muted}>Editing {branch ?? '…'} · working tree</p>
      {/* Posts and pages share one board; the filter lives in the URL so a view can be linked to. */}
      <nav className={`${styles.tabs} ${styles.filters}`} aria-label="Show">
        {FILTERS.map((f) => (
          <Link
            key={f.label}
            to="/editor"
            search={f.kind ? { kind: f.kind } : {}}
            activeOptions={{ exact: true, includeSearch: true }}
            className={styles.tab}
          >
            {f.label}
            {ready && <span className={styles.tabCount}> {ready.counts[f.kind ?? 'all']}</span>}
          </Link>
        ))}
      </nav>
      <div className={styles.board} aria-busy={board.status === 'loading'}>
        {board.status === 'loading' && <p className={styles.muted}>Loading…</p>}
        {board.status === 'error' && (
          <p role="alert" className={styles.alert}>
            Couldn't read your working tree.{' '}
            <Button variant="inline" onClick={board.retry}>
              Retry
            </Button>
          </p>
        )}
        {ready && ready.entries.length === 0 && (
          <p className={styles.muted}>{kind ? EMPTY[kind] : 'Nothing here yet.'}</p>
        )}
        {ready && ready.entries.length > 0 && (
          <Group title={`Files on this branch (${ready.entries.length})`}>
            {ready.entries.map((row) => (
              <Row key={row.dir} entry={row} onDelete={() => deleting.open(row)} />
            ))}
          </Group>
        )}
      </div>

      <ConfirmDialog
        open={deleting.isOpen}
        onOpenChange={deleting.onOpenChange}
        title={`Delete ‘${target?.slug}’?`}
        description={`This deletes ${target?.dir} from your working tree. It is an ordinary file deletion you can undo with git.`}
        confirm={{
          label: 'Delete',
          tone: 'danger',
          onClick: () => {
            if (target) {
              void runDelete(target);
            }
            deleting.close();
          },
        }}
      />
    </EditorShell>
  );
};

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => {
  return (
    <section className={styles.group} aria-label={title}>
      <h2 className={styles.groupTitle}>{title}</h2>
      <Stack as="ul" gap="2" role="list">
        {children}
      </Stack>
    </section>
  );
};

const Row = ({ entry, onDelete }: { entry: EditorEntry; onDelete: () => void }) => {
  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        <Link to="/editor/$slug" params={{ slug: entry.slug }} className={styles.rowTitle}>
          {entry.title}
        </Link>
        <span className={styles.rowMeta}>
          {entry.draft ? `${entry.dir} · marked draft` : entry.dir}
        </span>
      </div>
      <span className={styles.kindBadge}>{entry.kind}</span>
      <Link to="/editor/$slug" params={{ slug: entry.slug }} className={button()}>
        Edit
      </Link>
      <Menu
        trigger={
          <button
            type="button"
            className={iconButton({ size: 'sm' })}
            aria-label={`Actions for ${entry.slug}`}
          >
            <Icon name="lucide:ellipsis-vertical" size="sm" />
          </button>
        }
      >
        <MenuItem tone="danger" onClick={onDelete}>
          Delete entry
        </MenuItem>
      </Menu>
    </li>
  );
};

export const Route = createFileRoute('/editor/')({
  validateSearch: z.object({ kind: z.optional(z.enum(['post', 'page'])) }),
  head: () => ({ meta: [{ title: 'Editor' }] }),
  component: Board,
});
