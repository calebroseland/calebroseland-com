import { draftRef, StaleRefError } from "@crc/github-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useRef, useState } from "react";
import * as z from "zod/mini";
import { ConfirmDialog } from "../studio/Dialogs.tsx";
import {
  type Buffer,
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
import { invalidateDraft, postsTreeQuery, saveDraft } from "../studio/github/mutations.ts";
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
  const ref = draftRef(slug);
  const tree = useQuery(postsTreeQuery(gh, ref));

  if (tree.isPending) {
    return (
      <StudioShell title={slug}>
        <p className={styles.muted} aria-busy="true">
          Loading draft…
        </p>
      </StudioShell>
    );
  }
  if (tree.isError || !tree.data) {
    return (
      <StudioShell title={slug}>
        <p role="alert" className={styles.alert}>
          Couldn't load this draft from GitHub.{" "}
          <button type="button" className={styles.toastAction} onClick={() => tree.refetch()}>
            Retry
          </button>
        </p>
      </StudioShell>
    );
  }
  return (
    <DraftEditor
      key={`${ref}:${tree.data.headSha}`}
      slug={slug}
      initial={bufferFromBundle(tree.data, slug)}
    />
  );
}

function DraftEditor({ slug, initial }: { slug: string; initial: Buffer }) {
  const gh = useGitHub();
  const queryClient = useQueryClient();
  const { panel = "meta" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const storage = typeof window === "undefined" ? undefined : window.localStorage;
  const controller: BufferController = useMemo(() => {
    const local = readLocalBuffer(initial.ref, storage);
    // A local copy is only trusted when it was taken from the same head; otherwise the remote wins and the copy is dropped.
    const start =
      local && local.baseHeadSha === initial.baseHeadSha
        ? { ...local, existingAssets: initial.existingAssets }
        : initial;
    return createBufferStore(start);
  }, [initial, storage]);
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
      e.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [buffer.dirty]);

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
      queryClient.setQueryData(postsTreeQuery(gh, buffer.ref).queryKey, (old) =>
        old ? { ...old, headSha } : old,
      );
      await queryClient.invalidateQueries({ queryKey: ["studio", "drafts"] });
      notify(`Committed to ${buffer.ref}`, {
        action: {
          label: "View commit",
          onClick: () => window.open(commitUrl, "_blank", "noopener"),
        },
      });
    },
    onError: (err) => {
      if (err instanceof StaleRefError) setConflict(err);
      else
        notify("Couldn't save to GitHub. Your changes are still here.", {
          kind: "alert",
          action: { label: "Retry", onClick: () => save.mutate("save") },
        });
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
    const fresh = await gh.readBundle(initial.ref, initial.dir);
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
          <PublishDialog buffer={buffer} disabled={save.isPending} />
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
        <Link to="/studio">← Drafts</Link>
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
        title="This post changed on GitHub since you opened it."
        description="Reload to see the newer version (your local edits are discarded), or overwrite it with what you have here."
        actions={
          <>
            <button type="button" className={styles.secondary} onClick={() => setConflict(null)}>
              Cancel
            </button>
            <button type="button" className={styles.secondary} onClick={reloadFromGitHub}>
              Reload from GitHub
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
