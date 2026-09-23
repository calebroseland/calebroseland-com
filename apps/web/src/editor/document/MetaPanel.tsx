import { entry } from "@crc/content-schema";
import { Stack } from "@crc/ui";
import { useForm } from "@tanstack/react-form";
import type { Buffer, BufferController } from "../drafts/buffer.ts";
import styles from "../editor.module.css";

/* Frontmatter form. Slug is fixed after the first save (directory names are immutable). Validation is
   the same Zod schema the build uses, so what the editor accepts is what the site will publish. */

type Values = { title: string; date: string; tags: string; summary: string; draft: boolean };

export function MetaPanel({
  buffer,
  controller,
}: {
  buffer: Buffer;
  controller: BufferController;
}) {
  const form = useForm({
    defaultValues: {
      title: buffer.meta.title,
      date: buffer.meta.date,
      tags: buffer.meta.tags.join(", "),
      summary: buffer.meta.summary ?? "",
      draft: buffer.meta.draft,
    } satisfies Values,
    listeners: {
      onChange: ({ formApi }) => {
        const v = formApi.state.values;
        const tags = v.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        controller.setMeta({
          title: v.title,
          date: v.date,
          tags,
          draft: v.draft,
          ...(v.summary.trim() ? { summary: v.summary.trim() } : { summary: undefined }),
        });
      },
    },
  });

  const isPost = buffer.meta.kind === "post";

  const check = (values: Values): string | undefined => {
    const r = entry.safeParse({
      kind: buffer.meta.kind,
      slug: buffer.meta.slug,
      ...values,
      tags: values.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      summary: values.summary || undefined,
    });
    return r.success ? undefined : r.error.issues[0]?.message;
  };

  return (
    <form
      className={styles.panel}
      aria-label={`${isPost ? "Post" : "Page"} details`}
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <Stack gap="4">
        <form.Field
          name="title"
          validators={{
            onBlur: ({ value, fieldApi }) =>
              value.trim()
                ? check({ ...fieldApi.form.state.values, title: value })
                : "Title is required",
          }}
        >
          {(f) => (
            <Field label="Title" error={f.state.meta.errors[0]} id="meta-title">
              <input
                id="meta-title"
                className={styles.input}
                value={f.state.value}
                onChange={(e) => f.handleChange(e.target.value)}
                onBlur={f.handleBlur}
                required
              />
            </Field>
          )}
        </form.Field>
        <Field label="Slug" id="meta-slug" hint="Slugs are fixed after the first save.">
          <input
            id="meta-slug"
            className={styles.input}
            value={buffer.meta.slug}
            readOnly
            aria-readonly="true"
          />
        </Field>
        {isPost && (
          <>
            <form.Field
              name="date"
              validators={{
                onBlur: ({ value }) =>
                  Number.isNaN(Date.parse(value)) ? "Enter a valid date" : undefined,
              }}
            >
              {(f) => (
                <Field label="Date" error={f.state.meta.errors[0]} id="meta-date">
                  <input
                    id="meta-date"
                    type="date"
                    className={styles.input}
                    value={f.state.value}
                    onChange={(e) => f.handleChange(e.target.value)}
                    onBlur={f.handleBlur}
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name="tags">
              {(f) => (
                <Field label="Tags" id="meta-tags" hint="Comma separated.">
                  <input
                    id="meta-tags"
                    className={styles.input}
                    value={f.state.value}
                    onChange={(e) => f.handleChange(e.target.value)}
                    onBlur={f.handleBlur}
                  />
                </Field>
              )}
            </form.Field>
          </>
        )}
        <form.Field name="summary">
          {(f) => (
            <Field label="Summary" id="meta-summary">
              <textarea
                id="meta-summary"
                className={styles.input}
                rows={3}
                value={f.state.value}
                onChange={(e) => f.handleChange(e.target.value)}
                onBlur={f.handleBlur}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="draft">
          {(f) => (
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={f.state.value}
                onChange={(e) => f.handleChange(e.target.checked)}
              />
              <span>Draft (hidden from the live site)</span>
            </label>
          )}
        </form.Field>
      </Stack>
    </form>
  );
}

function Field({
  label,
  id,
  hint,
  error,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  error?: unknown;
  children: React.ReactNode;
}) {
  const message =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !message && <small className={styles.muted}>{hint}</small>}
      {message && (
        <small role="alert" className={styles.fieldError}>
          {message}
        </small>
      )}
    </div>
  );
}
