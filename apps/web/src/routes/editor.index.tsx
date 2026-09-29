import { Stack } from "@crc/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as z from "zod/mini";
import { ConfirmDialog } from "../editor/Dialogs.tsx";
import {
  useBeginEditing,
  useBoard,
  useDiscardEntry,
  useViewerLogin,
} from "../editor/data/hooks.ts";
import type { EntryKind } from "../editor/drafts/paths.ts";
import { RowMenu, RowMenuItem } from "../editor/drafts/RowMenu.tsx";
import { useCapabilities } from "../editor/EditorProvider.tsx";
import { EditorShell } from "../editor/EditorShell.tsx";
import styles from "../editor/editor.module.css";
import type { EditorEntry } from "../editor/entries.ts";
import { useOpenInEditor } from "../editor/navigation.ts";
import { notify } from "../editor/Toast.tsx";
import { useDialogState } from "../hooks/useDialogState.ts";

export const Route = createFileRoute("/editor/")({
  validateSearch: z.object({ kind: z.optional(z.enum(["post", "page"])) }),
  head: () => ({ meta: [{ title: "Editor" }] }),
  component: Board,
});

const FILTERS = [
  { label: "All", kind: undefined },
  { label: "Posts", kind: "post" },
  { label: "Pages", kind: "page" },
] as const;

const NEW_LABEL = { post: "New post", page: "New page" } as const;

/** The kind the board is narrowed to, kept in the URL so a view can be linked to. */
function useKindFilter(): EntryKind | undefined {
  return Route.useSearch().kind;
}

type Discarding = { ref: string; slug: string; dir: string };

function Board() {
  const kind = useKindFilter();
  const board = useBoard(kind);
  const login = useViewerLogin();
  const caps = useCapabilities();
  const local = !caps.branches;
  const discarding = useDialogState<Discarding>();
  const discard = useDiscardEntry();
  const edit = useBeginEditing();
  const openInEditor = useOpenInEditor();

  // Without branches there is nothing to throw away but the entry's files.
  const runDiscard = async (row: Discarding) => {
    const outcome = await discard.run(row);
    if (outcome.ok)
      notify(local ? "Deleted from your working tree" : "Discarded the draft branch", {
        kind: "success",
      });
    else notify("Couldn't discard that.", { kind: "error" });
  };

  const startEditing = async (slug: string) => {
    const outcome = await edit.run(slug);
    if (outcome.ok) await openInEditor(slug);
    else notify("Couldn't start editing that entry.", { kind: "error" });
  };

  const ready = board.status === "ready" ? board : null;
  const target = discarding.subject;

  return (
    <EditorShell
      actions={
        <Link to="/editor/new" search={kind ? { kind } : {}} className={styles.primary}>
          {kind ? NEW_LABEL[kind] : "New entry"}
        </Link>
      }
    >
      <p className={styles.muted}>
        Signed in as {login ?? "…"} · {caps.label}
      </p>
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
            {ready && <span className={styles.tabCount}> {ready.counts[f.kind ?? "all"]}</span>}
          </Link>
        ))}
      </nav>
      <div className={styles.board} aria-busy={board.status === "loading"}>
        {board.status === "loading" && <p className={styles.muted}>Loading…</p>}
        {board.status === "error" && (
          <p role="alert" className={styles.alert}>
            Couldn't load entries from GitHub.{" "}
            <button type="button" className={styles.toastAction} onClick={board.retry}>
              Retry
            </button>
          </p>
        )}
        {ready && ready.inProgress.length + ready.live.length === 0 && (
          <p className={styles.muted}>
            {kind === "page"
              ? "No pages yet."
              : kind === "post"
                ? "No posts yet."
                : "Nothing here yet."}
          </p>
        )}

        {ready && ready.inProgress.length > 0 && (
          <Group title={`In progress (${ready.inProgress.length})`}>
            {ready.inProgress.map((row) => (
              <Row
                key={row.ref}
                entry={row}
                action="Open"
                onDiscard={() => discarding.open({ ref: row.ref, slug: row.slug, dir: row.dir })}
              />
            ))}
          </Group>
        )}

        {ready && ready.live.length > 0 && (
          <Group
            title={
              local
                ? `Files on this branch (${ready.live.length})`
                : `Published (${ready.live.length})`
            }
          >
            {ready.live.map((row) => (
              <Row
                key={`${row.kind}:${row.slug}`}
                entry={row}
                action="Edit"
                {...(local
                  ? {
                      onDiscard: () =>
                        discarding.open({ ref: row.ref, slug: row.slug, dir: row.dir }),
                    }
                  : {
                      busy: edit.pending && edit.variables === row.slug,
                      onAction: () => void startEditing(row.slug),
                    })}
              />
            ))}
          </Group>
        )}
      </div>

      <ConfirmDialog
        open={discarding.isOpen}
        onOpenChange={discarding.onOpenChange}
        title={local ? `Delete ‘${target?.slug}’?` : `Discard ‘${target?.slug}’?`}
        description={
          local
            ? `This deletes ${target?.dir} from your working tree. It is an ordinary file deletion you can undo with git.`
            : `This deletes the branch ${target?.ref} and closes its pull request. Local unsaved changes are kept.`
        }
        actions={
          <>
            <button type="button" className={styles.secondary} onClick={discarding.close}>
              Cancel
            </button>
            <button
              type="button"
              className={`${styles.primary} ${styles.danger}`}
              onClick={() => {
                if (target) void runDiscard(target);
                discarding.close();
              }}
            >
              {local ? "Delete" : "Discard"}
            </button>
          </>
        }
      />
    </EditorShell>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.group} aria-label={title}>
      <h2 className={styles.groupTitle}>{title}</h2>
      <Stack as="ul" gap="2" role="list">
        {children}
      </Stack>
    </section>
  );
}

function describe(entry: EditorEntry): string {
  switch (entry.status) {
    case "pull-request":
      return `Pull request #${entry.pr?.number}`;
    case "draft":
      return entry.ref;
    case "working-tree":
      return entry.dir;
    default:
      return entry.draft ? `${entry.dir} · marked draft` : entry.dir;
  }
}

function Row({
  entry,
  action,
  busy,
  onAction,
  onDiscard,
}: {
  entry: EditorEntry;
  action: string;
  busy?: boolean;
  onAction?: () => void;
  onDiscard?: () => void;
}) {
  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        <Link to="/editor/$slug" params={{ slug: entry.slug }} className={styles.rowTitle}>
          {entry.title}
        </Link>
        <span className={styles.rowMeta}>{describe(entry)}</span>
      </div>
      {entry.kind && <span className={styles.kindBadge}>{entry.kind}</span>}
      {onAction ? (
        <button
          type="button"
          className={styles.secondary}
          onClick={onAction}
          disabled={busy}
          aria-busy={busy}
        >
          {busy ? "Starting…" : action}
        </button>
      ) : (
        <Link to="/editor/$slug" params={{ slug: entry.slug }} className={styles.secondary}>
          {action}
        </Link>
      )}
      {onDiscard && (
        <RowMenu label={`Actions for ${entry.slug}`}>
          <RowMenuItem onClick={onDiscard} danger>
            {entry.status === "working-tree" ? "Delete entry" : "Discard draft"}
          </RowMenuItem>
        </RowMenu>
      )}
    </li>
  );
}
