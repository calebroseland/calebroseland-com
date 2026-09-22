import { Stack } from "@crc/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ConfirmDialog } from "../studio/Dialogs.tsx";
import { RowMenu, RowMenuItem } from "../studio/drafts/RowMenu.tsx";
import { mergeEntries, publishedQuery, type StudioEntry } from "../studio/entries.ts";
import { deleteLocalEntry } from "../studio/github/local.ts";
import { beginEditing } from "../studio/github/mutations.ts";
import { draftsQuery, studioKeys } from "../studio/github/queries.ts";
import { useGitHub } from "../studio/StudioProvider.tsx";
import { StudioShell } from "../studio/StudioShell.tsx";
import styles from "../studio/studio.module.css";
import { notify } from "../studio/Toast.tsx";

export const Route = createFileRoute("/studio/")({
  head: () => ({ meta: [{ title: "Studio" }] }),
  component: Board,
});

function Board() {
  const gh = useGitHub();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const local = gh.kind === "local";
  const drafts = useQuery({ ...draftsQuery(gh), enabled: !local });
  const published = useQuery(
    publishedQuery(gh, gh.defaultBranch, local ? "working-tree" : "published"),
  );
  const [discarding, setDiscarding] = useState<{ ref: string; slug: string; dir: string } | null>(
    null,
  );

  // In working-tree mode there is no branch to throw away: discarding deletes the entry's files.
  const discard = useMutation({
    mutationFn: (row: { ref: string; dir: string }) =>
      local ? deleteLocalEntry(row.dir) : gh.deleteDraft(row.ref),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: studioKeys.all });
      notify(local ? "Deleted from your working tree" : "Discarded the draft branch");
    },
    onError: () => notify("Couldn't discard that.", { kind: "alert" }),
  });

  const edit = useMutation({
    mutationFn: (slug: string) => beginEditing(gh, slug),
    onSuccess: async (_, slug) => {
      await queryClient.invalidateQueries({ queryKey: studioKeys.all });
      await navigate({ to: "/studio/$draft", params: { draft: slug } });
    },
    onError: () => notify("Couldn't start editing that entry.", { kind: "alert" }),
  });

  // Working-tree rows are already the entries themselves; there are no branches to merge over them.
  const rows = local
    ? (published.data ?? [])
    : mergeEntries(published.data ?? [], drafts.data ?? []);
  const inProgress = rows.filter((r) => r.status === "draft" || r.status === "pull-request");
  const live = rows.filter((r) => r.status === "published" || r.status === "working-tree");
  const pending = (!local && drafts.isPending) || published.isPending;

  return (
    <StudioShell
      actions={
        <>
          <Link to="/studio/profile" className={styles.secondary}>
            Edit card
          </Link>
          <Link to="/studio/new" className={styles.primary}>
            New entry
          </Link>
        </>
      }
    >
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
        {!pending && rows.length === 0 && <p className={styles.muted}>Nothing here yet.</p>}

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
    </StudioShell>
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

function describe(entry: StudioEntry): string {
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
  entry: StudioEntry;
  action: string;
  busy?: boolean;
  onAction?: () => void;
  onDiscard?: () => void;
}) {
  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        <Link to="/studio/$draft" params={{ draft: entry.slug }} className={styles.rowTitle}>
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
        <Link to="/studio/$draft" params={{ draft: entry.slug }} className={styles.secondary}>
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
