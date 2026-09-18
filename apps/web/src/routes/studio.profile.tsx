import type { Profile, ProfileLink } from "@crc/content-schema";
import { profile as profileSchema } from "@crc/content-schema";
import {
  DropIndicator,
  moveAnnouncement,
  moveIndex,
  reorder,
  useItemRegistration,
  useListReorder,
} from "@crc/interaction";
import { Icon, Stack } from "@crc/ui";
import { mdiDragVertical } from "@crc/ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { stringify } from "yaml";
import { siteProfile } from "../content/profile.ts";
import { RowMenu, RowMenuItem } from "../studio/drafts/RowMenu.tsx";
import { studioKeys } from "../studio/github/queries.ts";
import { useGitHub } from "../studio/StudioProvider.tsx";
import { StudioShell } from "../studio/StudioShell.tsx";
import styles from "../studio/studio.module.css";
import { notify } from "../studio/Toast.tsx";

/* Reorder profile links. Pointer drag via Pragmatic DnD; keyboard via the row menu. Both call the same
   pure `reorder`. Saving writes content/profile.yaml to a drafts/profile branch (publish flow in Phase 5). */

export const Route = createFileRoute("/studio/profile")({
  head: () => ({ meta: [{ title: "Profile links · Studio" }] }),
  component: ProfileRoute,
});

type Row = ProfileLink & { id: string; group: string };

const flatten = (p: Profile): Row[] =>
  p.groups.flatMap((g) =>
    g.links.map((l) => ({ ...l, id: `${g.title}:${l.url}`, group: g.title })),
  );
const regroup = (base: Profile, rows: Row[]): Profile => ({
  ...base,
  groups: base.groups.map((g) => ({
    ...g,
    links: rows
      .filter((r) => r.group === g.title)
      .map(({ id: _id, group: _group, ...link }) => link),
  })),
});

const PROFILE_REF = "drafts/profile";

function ProfileRoute() {
  const gh = useGitHub();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>(() => flatten(siteProfile));
  const [dirty, setDirty] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const branch = useQuery({
    queryKey: studioKeys.bundle(PROFILE_REF, "content"),
    queryFn: () => gh.listDrafts().then((d) => d.find((x) => x.ref === PROFILE_REF) ?? null),
  });

  const apply = (next: Row[]) => {
    setRows(next);
    setDirty(true);
  };
  useListReorder(rows, apply);

  const save = useMutation({
    mutationFn: async () => {
      const next = profileSchema.parse(regroup(siteProfile, rows));
      let draft = branch.data ?? (await gh.createDraft("profile"));
      const fresh = await gh.readBundle(draft.ref, "content");
      draft = { ...draft, headSha: fresh.headSha };
      return gh.saveBundle({
        ref: draft.ref,
        dir: "content",
        files: [{ path: "profile.yaml", content: stringify(next) }],
        message: "profile: reorder links",
        expectedHeadSha: draft.headSha,
      });
    },
    onSuccess: async () => {
      setDirty(false);
      await queryClient.invalidateQueries({ queryKey: studioKeys.drafts() });
      notify(`Committed to ${PROFILE_REF}`);
    },
    onError: () => notify("Couldn't save profile links.", { kind: "alert" }),
  });

  return (
    <StudioShell
      title="Profile links"
      actions={
        <button
          type="button"
          className={styles.primary}
          onClick={() => save.mutate()}
          disabled={!dirty || save.isPending}
          aria-busy={save.isPending}
        >
          {save.isPending ? "Saving…" : "Save"}
        </button>
      }
    >
      <p className={styles.muted}>
        Drag rows, or use each row's menu to move it with the keyboard. Groups keep their order;
        links move within and between groups by position.
      </p>
      <Stack as="ol" gap="2" role="list" aria-label="Profile links">
        {rows.map((row, index) => (
          <LinkRow
            key={row.id}
            row={row}
            index={index}
            count={rows.length}
            onMove={(cmd) => {
              const to = moveIndex(index, rows.length, cmd);
              if (to === index) return;
              apply(reorder(rows, index, to));
              setAnnouncement(moveAnnouncement(row.label, to, rows.length));
            }}
          />
        ))}
      </Stack>
      <output aria-live="polite" className="visually-hidden">
        {announcement}
      </output>
    </StudioShell>
  );
}

function LinkRow({
  row,
  index,
  count,
  onMove,
}: {
  row: Row;
  index: number;
  count: number;
  onMove: (cmd: "up" | "down" | "top" | "bottom") => void;
}) {
  const { ref, handleRef, state } = useItemRegistration(row.id, index);
  useEffect(() => {
    // Pragmatic DnD attaches to the element after mount; nothing else to do here.
  }, []);
  return (
    <li
      ref={ref as React.RefObject<HTMLLIElement>}
      className={styles.row}
      data-dragging={state.dragging}
    >
      <span
        ref={handleRef as React.RefObject<HTMLSpanElement>}
        className={styles.handle}
        aria-hidden="true"
      >
        <Icon path={mdiDragVertical} size="sm" />
      </span>
      <div className={styles.rowMain}>
        <span className={styles.rowTitle}>{row.label}</span>
        <span className={styles.rowMeta}>
          {row.group} · {row.url}
        </span>
      </div>
      <RowMenu label={`Move ${row.label}`}>
        <RowMenuItem onClick={() => onMove("up")} disabled={index === 0}>
          Move up
        </RowMenuItem>
        <RowMenuItem onClick={() => onMove("down")} disabled={index === count - 1}>
          Move down
        </RowMenuItem>
        <RowMenuItem onClick={() => onMove("top")} disabled={index === 0}>
          Move to top
        </RowMenuItem>
        <RowMenuItem onClick={() => onMove("bottom")} disabled={index === count - 1}>
          Move to bottom
        </RowMenuItem>
      </RowMenu>
      <DropIndicator edge={state.edge} />
    </li>
  );
}
