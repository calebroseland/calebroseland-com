import { z } from "zod";

/** Frontmatter shared by every content kind. Directory names are immutable; `slug` is the display slug. */
const base = z.object({
  title: z.string().min(1),
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "slug must be lowercase words separated by single hyphens",
    ),
  date: z.coerce.date(),
  draft: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  summary: z.string().optional(),
});

export const post = base.extend({ kind: z.literal("post") });
export const page = base.extend({ kind: z.literal("page") });

// Reserved; agreed shape, not implemented in v1:
// export const project = base.extend({ kind: z.literal("project"), repo: z.url().optional(), stack: z.array(z.string()) });
// export const gallery = base.extend({ kind: z.literal("gallery"), items: z.array(mediaItem) });

export const entry = z.discriminatedUnion("kind", [post, page]);

export type Entry = z.infer<typeof entry>;

/** Build-time index record for one entry: frontmatter with the date serialized, plus its identity and optional hero url. */
export type EntryMeta = Omit<Entry, "date"> & {
  id: string;
  dir: string;
  date: string;
  hero?: string;
};
export type Post = z.infer<typeof post>;
export type Page = z.infer<typeof page>;
