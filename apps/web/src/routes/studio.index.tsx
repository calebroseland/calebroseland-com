import { Stack } from "@crc/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ConfirmDialog } from "../studio/Dialogs.tsx";
import { RowMenu, RowMenuItem } from "../studio/drafts/RowMenu.tsx";
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
  const drafts = useQuery(draftsQuery(gh));
  const [discarding, setDiscarding] = useState<{ ref: string; slug: string } | null>(null);
  const discard = useMutation({
    mutationFn: (ref: string) => gh.deleteDraft(ref),
    onSuccess: async (_, ref) => {
      await queryClient.invalidateQueries({ queryKey: studioKeys.drafts() });
      notify(`Discarded ${ref}`);
    },
    onError: () => notify("Couldn't discard the draft.", { kind: "alert" }),
  });

  const local =
    drafts.data?.filter((d) => localStorage.getItem(`crc:buffer:${d.ref}`) !== null) ?? [];
  const withPr = drafts.data?.filter((d) => d.pr) ?? [];
  const branches = drafts.data?.filter((d) => !d.pr) ?? [];

  return (
    <StudioShell
      actions={
        <>
          <Link to="/studio/profile" className={styles.secondary}>
            Profile links
          </Link>
          <Link to="/studio/new" className={styles.primary}>
            New post
          </Link>
        </>
      }
    >
      <div className={styles.board} aria-busy={drafts.isPending}>
        {drafts.isPending && <p className={styles.muted}>Loading drafts…</p>}
        {drafts.isError && (
          <p role="alert" className={styles.alert}>
            Couldn't load drafts from GitHub.{" "}
            <button type="button" className={styles.toastAction} onClick={() => drafts.refetch()}>
              Retry
            </button>
          </p>
        )}
        {drafts.data && drafts.data.length === 0 && <p className={styles.muted}>No drafts yet.</p>}
        {local.length > 0 && (
          <Group title={`Unsaved on this device (${local.length})`}>
            {local.map((d) => (
              <Row key={d.ref} slug={d.slug} meta="has unsaved changes here" action="Resume" />
            ))}
          </Group>
        )}
        {branches.length > 0 && (
          <Group title={`Draft branches (${branches.length})`}>
            {branches.map((d) => (
              <Row
                key={d.ref}
                slug={d.slug}
                meta={d.ref}
                action="Open"
                onDiscard={() => setDiscarding(d)}
              />
            ))}
          </Group>
        )}
        {withPr.length > 0 && (
          <Group title={`Awaiting merge (${withPr.length})`}>
            {withPr.map((d) => (
              <Row
                key={d.ref}
                slug={d.slug}
                meta={`Pull request #${d.pr?.number}`}
                action="Open"
                onDiscard={() => setDiscarding(d)}
              />
            ))}
          </Group>
        )}
      </div>
      <ConfirmDialog
        open={discarding !== null}
        onOpenChange={(o) => !o && setDiscarding(null)}
        title={`Discard ‘${discarding?.slug}’?`}
        description={`This deletes the branch ${discarding?.ref} and closes its pull request. Local unsaved changes are kept.`}
        actions={
          <>
            <button type="button" className={styles.secondary} onClick={() => setDiscarding(null)}>
              Cancel
            </button>
            <button
              type="button"
              className={`${styles.primary} ${styles.danger}`}
              onClick={() => {
                if (discarding) discard.mutate(discarding.ref);
                setDiscarding(null);
              }}
            >
              Discard
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

function Row({
  slug,
  meta,
  action,
  onDiscard,
}: {
  slug: string;
  meta: string;
  action: string;
  onDiscard?: () => void;
}) {
  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        <Link to="/studio/$draft" params={{ draft: slug }} className={styles.rowTitle}>
          {slug}
        </Link>
        <span className={styles.rowMeta}>{meta}</span>
      </div>
      <Link to="/studio/$draft" params={{ draft: slug }} className={styles.secondary}>
        {action}
      </Link>
      {onDiscard && (
        <RowMenu label={`Actions for ${slug}`}>
          <RowMenuItem onClick={onDiscard} danger>
            Discard draft
          </RowMenuItem>
        </RowMenu>
      )}
    </li>
  );
}
