import { Stack } from "@crc/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import * as z from "zod/mini";
import { type EntryKind, slugify } from "../studio/drafts/paths.ts";
import { createEntryDraft } from "../studio/github/mutations.ts";
import { studioKeys } from "../studio/github/queries.ts";
import { useGitHub } from "../studio/StudioProvider.tsx";
import { StudioShell } from "../studio/StudioShell.tsx";
import styles from "../studio/studio.module.css";

export const Route = createFileRoute("/studio/new")({
  validateSearch: z.object({ kind: z.optional(z.enum(["post", "page"])) }),
  head: () => ({ meta: [{ title: "New entry · Studio" }] }),
  component: NewEntry,
});

function NewEntry() {
  const gh = useGitHub();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { kind: initialKind = "post" } = Route.useSearch();
  const [kind, setKind] = useState<EntryKind>(initialKind);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const effectiveSlug = slugTouched ? slug : slugify(title);
  const slugOk = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(effectiveSlug);

  const create = useMutation({
    mutationFn: () =>
      createEntryDraft(gh, {
        kind,
        title: title.trim(),
        slug: effectiveSlug,
        date: new Date(`${date}T00:00:00Z`),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: studioKeys.all });
      await navigate({ to: "/studio/$draft", params: { draft: effectiveSlug } });
    },
  });

  return (
    <StudioShell title="New entry">
      <form
        className={styles.panel}
        style={{ maxInlineSize: "32rem" }}
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim() && slugOk) create.mutate();
        }}
        aria-busy={create.isPending}
      >
        <Stack gap="4">
          <fieldset className={styles.fieldset}>
            <legend>Kind</legend>
            {(["post", "page"] as const).map((k) => (
              <label key={k} className={styles.check}>
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => setKind(k)}
                />
                <span>
                  {k === "post"
                    ? "Post — dated, listed under Posts"
                    : "Page — standalone, at its own address"}
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
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="new-slug">Slug</label>
            <input
              id="new-slug"
              className={styles.input}
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              aria-invalid={effectiveSlug.length > 0 && !slugOk}
              aria-describedby="new-slug-hint"
            />
            <small
              id="new-slug-hint"
              className={effectiveSlug && !slugOk ? styles.fieldError : styles.muted}
            >
              {effectiveSlug && !slugOk
                ? "Lowercase words separated by single hyphens."
                : "Fixed after the first save."}
            </small>
          </div>
          {kind === "post" && (
            <div className={styles.field}>
              <label htmlFor="new-date">Date</label>
              <input
                id="new-date"
                type="date"
                className={styles.input}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          )}
          {create.isError && (
            <p role="alert" className={styles.alert}>
              Couldn't create it:{" "}
              {create.error instanceof Error ? create.error.message : "unknown error"}
            </p>
          )}
          <div>
            <button
              type="submit"
              className={styles.primary}
              disabled={!title.trim() || !slugOk || create.isPending}
            >
              {create.isPending ? "Creating…" : `Create ${kind}`}
            </button>
          </div>
        </Stack>
      </form>
    </StudioShell>
  );
}
