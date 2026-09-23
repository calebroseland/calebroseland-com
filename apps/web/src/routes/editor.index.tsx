import { Stack } from "@crc/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import * as z from "zod/mini";
import { ConfirmDialog } from "../editor/Dialogs.tsx";
import { beginEditingMutation, discardEntryMutation } from "../editor/data/mutations.ts";
import { draftsQuery, publishedQuery, viewerQuery } from "../editor/data/queries.ts";
import type { EntryKind } from "../editor/drafts/paths.ts";
import { RowMenu, RowMenuItem } from "../editor/drafts/RowMenu.tsx";
import { useCapabilities, useGitHub } from "../editor/EditorProvider.tsx";
import { EditorShell } from "../editor/EditorShell.tsx";
import styles from "../editor/editor.module.css";
import { type EditorEntry, mergeEntries } from "../editor/entries.ts";
import { notify } from "../editor/Toast.tsx";

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

function Board() {
  const gh = useGitHub();
  const { kind } = Route.useSearch();
  const viewer = useQuery(viewerQuery(gh));
  const navigate = useNavigate();
  const caps = useCapabilities();
  const local = !caps.branches;
  const drafts = useQuery({ ...draftsQuery(gh), enabled: !local });
  const published = useQuery(publishedQuery(gh));
  const [discarding, setDiscarding] = useState<{ ref: string; slug: string; dir: string } | null>(
    null,
  );

  // In working-tree mode there is no branch to throw away: discarding deletes the entry's files.
  const discard = useMutation({
    ...discardEntryMutation(gh),
    onSuccess: () => {
      notify(local ? "Deleted from your working tree" : "Discarded the draft branch");
    },
    onError: () => notify("Couldn't discard that.", { kind: "alert" }),
  });

  const edit = useMutation({
    ...beginEditingMutation(gh),
    onSuccess: async (_, slug) => {
      await navigate({ to: "/editor/$slug", params: { slug } });
    },
    onError: () => notify("Couldn't start editing that entry.", { kind: "alert" }),
  });

  // Working-tree rows are already the entries themselves; there are no branches to merge over them.
  const all = local
    ? (published.data ?? [])
    : mergeEntries(published.data ?? [], drafts.data ?? []);
  const count = (k: EntryKind | undefined) => (k ? all.filter((r) => r.kind === k) : all).length;
  const rows = kind ? all.filter((r) => r.kind === kind) : all;
  const inProgress = rows.filter((r) => r.status === "draft" || r.status === "pull-request");
  const live = rows.filter((r) => r.status === "published" || r.status === "working-tree");
  const pending = (!local && drafts.isPending) || published.isPending;

  return (
    <EditorShell
      actions={
        <Link to="/editor/new" search={kind ? { kind } : {}} className={styles.primary}>
          {kind ? NEW_LABEL[kind] : "New entry"}
        </Link>
      }
    >
      <p className={styles.muted}>
        Signed in as {viewer.data?.login ?? "…"} · {caps.label}
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
            {!pending && <span className={styles.tabCount}> {count(f.kind)}</span>}
          </Link>
        ))}
      </nav>
      <div className={styles.board} aria-busy={pending}>
        {pending && <p className={styles.muted}>Loading…</p>}
        {(drafts.isError || published.isError) && (
          <p role="alert" className={styles.alert}>
            Couldn't load entries from GitHub.{" "}
            <button
              type="button"
              className={styles.toastAction}
              onClick={() => {
                void drafts.refetch();
                void published.refetch();
              }}
            >
              Retry
            </button>
          </p>
        )}
        {!pending && rows.length === 0 && (
          <p className={styles.muted}>
            {kind === "page"
              ? "No pages yet."
              : kind === "post"
                ? "No posts yet."
                : "Nothing here yet."}
          </p>
        )}

        {inProgress.length > 0 && (
          <Group title={`In progress (${inProgress.length})`}>
            {inProgress.map((row) => (
              <Row
                key={row.ref}
                entry={row}
                action="Open"
                onDiscard={() => setDiscarding({ ref: row.ref, slug: row.slug, dir: row.dir })}
              />
            ))}
          </Group>
        )}

        {live.length > 0 && (
          <Group
            title={local ? `Files on this branch (${live.length})` : `Published (${live.length})`}
          >
            {live.map((row) => (
              <Row
                key={`${row.kind}:${row.slug}`}
                entry={row}
                action="Edit"
                {...(local
                  ? {
                      onDiscard: () =>
                        setDiscarding({ ref: row.ref, slug: row.slug, dir: row.dir }),
                    }
                  : {
                      busy: edit.isPending && edit.variables === row.slug,
                      onAction: () => edit.mutate(row.slug),
                    })}
              />
            ))}
          </Group>
        )}
      </div>

      <ConfirmDialog
        open={discarding !== null}
        onOpenChange={(o) => !o && setDiscarding(null)}
        title={local ? `Delete ‘${discarding?.slug}’?` : `Discard ‘${discarding?.slug}’?`}
        description={
          local
            ? `This deletes ${discarding?.dir} from your working tree. It is an ordinary file deletion you can undo with git.`
            : `This deletes the branch ${discarding?.ref} and closes its pull request. Local unsaved changes are kept.`
        }
        actions={
          <>
            <button type="button" className={styles.secondary} onClick={() => setDiscarding(null)}>
              Cancel
            </button>
            <button
              type="button"
              className={`${styles.primary} ${styles.danger}`}
              onClick={() => {
                if (discarding) discard.mutate(discarding);
                setDiscarding(null);
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
