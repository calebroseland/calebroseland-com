import { type Entry, entry } from "@crc/content-schema";
import matter from "gray-matter";

export type ParsedEntry = { meta: Entry; body: string };

/** Splits frontmatter from body and validates the frontmatter. Throws a ZodError naming the field. */
export function parseEntry(text: string): ParsedEntry {
  const { data, content } = matter(text);
  return { meta: entry.parse(data), body: content };
}

/** Inverse of parseEntry. Dates serialize as YYYY-MM-DD; defaults are written explicitly so the file is self-describing. */
export function serializeEntry({ meta, body }: ParsedEntry): string {
  const data: Record<string, unknown> = {
    ...meta,
    date: meta.date.toISOString().slice(0, 10),
  };
  if (!meta.placeholder) delete data.placeholder;
  if (meta.summary === undefined) delete data.summary;
  return matter.stringify(body.endsWith("\n") ? body : `${body}\n`, data);
}
