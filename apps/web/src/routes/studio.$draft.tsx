import { type Bundle, StaleRefError } from "@crc/github-client";
import { Stack } from "@crc/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useEffect, useRef, useState } from "react";
import * as z from "zod/mini";
import { ConfirmDialog } from "../studio/Dialogs.tsx";
import {
  type BufferController,
  createBufferStore,
  missingAlt,
  readLocalBuffer,
  writeLocalBuffer,
} from "../studio/drafts/buffer.ts";
import { bufferFromBundle } from "../studio/drafts/load.ts";
import { AssetsPanel } from "../studio/editor/AssetsPanel.tsx";
import { Editor, type EditorApi } from "../studio/editor/Editor.tsx";
import { MetaPanel } from "../studio/editor/MetaPanel.tsx";
import { ImageTooLargeError, resizeImage, UnsupportedImageError } from "../studio/editor/resize.ts";
import {
  beginEditing,
  contentTreeQuery,
  findEntryDir,
  invalidateDraft,
  saveDraft,
} from "../studio/github/mutations.ts";
import { draftsQuery, studioKeys } from "../studio/github/queries.ts";
import { PublishDialog } from "../studio/publish/PublishDialog.tsx";
import { useGitHub } from "../studio/StudioProvider.tsx";
import { StudioShell } from "../studio/StudioShell.tsx";
import styles from "../studio/studio.module.css";
import { notify } from "../studio/Toast.tsx";

export const Route = createFileRoute("/studio/$draft")({
  validateSearch: z.object({ panel: z.optional(z.enum(["meta", "media"])) }),
  head: ({ params }) => ({ meta: [{ title: `${params.draft} · Studio` }] }),
  component: DraftRoute,
});

function DraftRoute() {
  const { draft: slug } = Route.useParams();
  const gh = useGitHub();
  const queryClient = useQueryClient();
  const drafts = useQuery(draftsQuery(gh));
  // A slug with no branch of its own is already on the default branch; read it there so the entry can
  // be previewed, and branch from it only when the author actually chooses to edit.
  const draft = drafts.data?.find((d) => d.slug === slug);
  const ref = draft?.ref ?? gh.defaultBranch;
  const tree = useQuery({ ...contentTreeQuery(gh, ref), enabled: drafts.isSuccess });

  const beginEdit = useMutation({
    mutationFn: () => beginEditing(gh, slug),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: studioKeys.all });
    },
    onError: () => notify("Couldn't start editing this entry.", { kind: "alert" }),
  });

  if (drafts.isPending || tree.isPending) {
    return (
      <StudioShell title={slug}>
        <p className={styles.muted} aria-busy="true">
          Loading…
        </p>
      </StudioShell>
    );
  }
  if (drafts.isError || tree.isError || !tree.data) {
    return (
      <StudioShell title={slug}>
        <p role="alert" className={styles.alert}>
          Couldn't load this entry from GitHub.{" "}
          <button type="button" className={styles.toastAction} onClick={() => tree.refetch()}>
            Retry
          </button>
        </p>
      </StudioShell>
    );
  }
  if (
    !findEntryDir(
      tree.data.files.map((f) => f.path),
      slug,
    )
  ) {
    return (
      <StudioShell title={slug}>
        <p role="alert" className={styles.alert}>
          No entry with the slug “{slug}” exists on {ref}.
        </p>
        <p className={styles.muted}>
          <Link to="/studio">← Back to the board</Link>
        </p>
      </StudioShell>
    );
  }
  if (!draft) {
    return (
      <StudioShell title={slug}>
        <Stack gap="4">
          <p className={styles.muted}>
            This entry is published on <code>{gh.defaultBranch}</code>. Editing it starts a draft
            branch from there and reuses the existing bundle, so nothing is duplicated.
          </p>
          <div>
            <button
              type="button"
              className={styles.primary}
              onClick={() => beginEdit.mutate()}
              disabled={beginEdit.isPending}
              aria-busy={beginEdit.isPending}
            >
              {beginEdit.isPending ? "Starting…" : "Edit this entry"}
            </button>
          </div>
        </Stack>
      </StudioShell>
    );
  }
  // Keyed by ref only: a save advances the head, and remounting on that would rebuild the editor from
  // the pre-save cache and blank the body. Wholesale replacements are handled inside the component.
  return <DraftEditor key={ref} slug={slug} bundle={tree.data} />;
}

function DraftEditor({ slug, bundle }: { slug: string; bundle: Bundle }) {
  const gh = useGitHub();
  const queryClient = useQueryClient();
  const { panel = "meta" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const storage = typeof window === "undefined" ? undefined : window.localStorage;
  // Built once per branch; later refetches update the cache, not the working copy.
  const [controller] = useState<BufferController>(() => {
    const initial = bufferFromBundle(bundle, slug);
    const local = readLocalBuffer(initial.ref, storage);
    // Unsaved work always wins on load, even when the source moved underneath it: it keeps its own
    // base, so saving is refused with the conflict dialog rather than the edit being thrown away here.
    const start = local ? { ...local, existingAssets: initial.existingAssets } : initial;
    return createBufferStore(start);
  });
  const buffer = useStore(controller.store);
  const api = useRef<EditorApi | null>(null);
  const [conflict, setConflict] = useState<StaleRefError | null>(null);
  // TipTap reads its content once; bump this to remount the editor when the buffer is replaced wholesale.
  const [editorGeneration, setEditorGeneration] = useState(0);

  // Autosave the working copy locally, debounced; never commits.
  useEffect(() => {
    const t = setTimeout(() => writeLocalBuffer(buffer, storage), 500);
    return () => clearTimeout(t);
  }, [buffer, storage]);

  useEffect(() => {
    if (!buffer.dirty) return;
    const guard = (e: BeforeUnloadEvent) => {
      // Flush synchronously: a reload inside the autosave debounce would otherwise lose the edit, and
      // the dev server reloads the page whenever content changes on disk.
      writeLocalBuffer(controller.store.state, storage);
      e.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [buffer.dirty, controller, storage]);

  const save = useMutation({
    mutationFn: async (mode: "save" | "overwrite") => {
      const b = controller.store.state;
      if (mode === "overwrite") {
        const fresh = await gh.readBundle(b.ref, b.dir);
        controller.rebase(fresh.headSha);
      }
      return saveDraft(gh, controller.store.state);
    },
    onSuccess: async ({ headSha, commitUrl }) => {
      controller.markSaved(headSha);
      writeLocalBuffer(controller.store.state, storage);
      // Refetch from the backend rather than patching the cache, so the cached bundle always matches
      // what was actually committed.
      await invalidateDraft(queryClient, buffer.ref);
      if (gh.kind === "local") {
        notify(`Saved ${buffer.dir} to your working tree`);
      } else {
        notify(`Committed to ${buffer.ref}`, {
          action: {
            label: "View commit",
            onClick: () => window.open(commitUrl, "_blank", "noopener"),
          },
        });
      }
    },
    onError: (err) => {
      if (err instanceof StaleRefError) setConflict(err);
      else
        notify(
          gh.kind === "local"
            ? "Couldn't write to your working tree. Your changes are still here."
            : "Couldn't save to GitHub. Your changes are still here.",
          { kind: "alert", action: { label: "Retry", onClick: () => save.mutate("save") } },
        );
    },
  });

  const onSave = () => {
    const missing = missingAlt(buffer);
    if (missing.length > 0) {
      notify(`Add alt text for ${missing.length} image${missing.length > 1 ? "s" : ""}.`, {
        kind: "alert",
      });
      void navigate({ search: { panel: "media" } });
      return;
    }
    if (!buffer.meta.title.trim()) {
      notify("Add a title before saving.", { kind: "alert" });
      void navigate({ search: { panel: "meta" } });
      return;
    }
    save.mutate("save");
  };

  const onImageFiles = async (files: File[]) => {
    for (const file of files) {
      try {
        const img = await resizeImage(file);
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = () => reject(r.error);
          r.readAsDataURL(img.blob);
        });
        controller.addAsset({
          name: img.name,
          type: img.type,
          dataUrl,
          alt: "",
          width: img.width,
          height: img.height,
        });
        api.current?.insertImage(img.name, "");
        void navigate({ search: { panel: "media" } });
      } catch (err) {
        if (err instanceof UnsupportedImageError || err instanceof ImageTooLargeError)
          notify(err.message, { kind: "alert" });
        else notify("Couldn't process that image.", { kind: "alert" });
      }
    }
  };

  const reloadFromGitHub = async () => {
    setConflict(null);
    // Clear the local copy first (a clean buffer removes its key), then take the remote version as the new base.
    writeLocalBuffer({ ...controller.store.state, dirty: false }, storage);
    const fresh = await gh.readBundle(buffer.ref, buffer.dir);
    controller.replace(bufferFromBundle(fresh, slug));
    setEditorGeneration((g) => g + 1);
    await invalidateDraft(queryClient, buffer.ref);
  };

  return (
    <StudioShell
      title={buffer.meta.title || slug}
      actions={
        <div className={styles.editorBar}>
          <span className={styles.status} data-dirty={buffer.dirty}>
            {save.isPending ? "Saving…" : buffer.dirty ? "Unsaved changes" : "Saved"}
          </span>
          <button
            type="button"
            className={styles.primary}
            onClick={onSave}
            disabled={!buffer.dirty || save.isPending}
            aria-busy={save.isPending}
          >
            {save.isPending ? "Saving…" : "Save"}
          </button>
          {/* Nothing to publish in working-tree mode: the file is already on your branch. */}
          {gh.kind !== "local" && <PublishDialog buffer={buffer} disabled={save.isPending} />}
        </div>
      }
    >
      {buffer.restoredFromLocal && (
        <p role="status" className={styles.banner}>
          Restored unsaved changes from this device.
          <button type="button" className={styles.toastAction} onClick={reloadFromGitHub}>
            Discard local changes
          </button>
        </p>
      )}
      <p className={styles.muted}>
        <Link to="/studio">{gh.kind === "local" ? "← Entries" : "← Drafts"}</Link>
      </p>
      <div className={styles.editorContainer}>
        <div className={styles.editorLayout}>
          <Editor
            key={editorGeneration}
            initialMarkdown={buffer.markdown}
            onChange={controller.setMarkdown}
            onImageFiles={onImageFiles}
            apiRef={api}
          />
          <aside aria-label="Post details and images">
            <div className={styles.tabs} role="tablist" aria-label="Panel">
              {(["meta", "media"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  id={`tab-${p}`}
                  aria-selected={panel === p}
                  aria-controls={`panel-${p}`}
                  className={styles.tab}
                  onClick={() => navigate({ search: { panel: p } })}
                >
                  {p === "meta"
                    ? "Details"
                    : `Images${buffer.assets.length ? ` (${buffer.assets.length})` : ""}`}
                </button>
              ))}
            </div>
            <div id={`panel-${panel}`} role="tabpanel" aria-labelledby={`tab-${panel}`}>
              {panel === "meta" ? (
                <MetaPanel buffer={buffer} controller={controller} />
              ) : (
                <AssetsPanel buffer={buffer} controller={controller} />
              )}
            </div>
          </aside>
        </div>
      </div>
      <ConfirmDialog
        open={conflict !== null}
        onOpenChange={(o) => !o && setConflict(null)}
        title={
          gh.kind === "local"
            ? "This file changed on disk since you opened it."
            : "This post changed on GitHub since you opened it."
        }
        description={
          gh.kind === "local"
            ? "Reload to see what is on disk now (your unsaved edits are discarded), or overwrite the file with what you have here."
            : "Reload to see the newer version (your local edits are discarded), or overwrite it with what you have here."
        }
        actions={
          <>
            <button type="button" className={styles.secondary} onClick={() => setConflict(null)}>
              Cancel
            </button>
            <button type="button" className={styles.secondary} onClick={reloadFromGitHub}>
              {gh.kind === "local" ? "Reload from disk" : "Reload from GitHub"}
            </button>
            <button
              type="button"
              className={`${styles.primary} ${styles.danger}`}
              onClick={() => {
                setConflict(null);
                save.mutate("overwrite");
              }}
            >
              Overwrite
            </button>
          </>
        }
      />
    </StudioShell>
  );
}
