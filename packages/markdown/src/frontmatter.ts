import { type Entry, entry } from "@crc/content-schema";
import { parse, stringify } from "yaml";

/* Frontmatter split and join on `---` fences. Hand-rolled over gray-matter because that package reaches
   for Node's Buffer and this code also runs in the studio (browser). */

export type ParsedEntry = { meta: Entry; body: string };

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function splitFrontmatter(text: string): { data: unknown; body: string } {
  const m = FENCE.exec(text);
  if (!m) return { data: {}, body: text };
  return { data: parse(m[1] ?? "") ?? {}, body: text.slice(m[0].length) };
}

/** Splits frontmatter from body and validates the frontmatter. Throws a ZodError naming the field. */
export function parseEntry(text: string): ParsedEntry {
  const { data, body } = splitFrontmatter(text);
  return { meta: entry.parse(data), body };
}

/** Inverse of parseEntry. Dates serialize as YYYY-MM-DD; defaults are written explicitly so the file is self-describing. */
export function serializeEntry({ meta, body }: ParsedEntry): string {
  const data: Record<string, unknown> = { ...meta, date: meta.date.toISOString().slice(0, 10) };
  if (!meta.placeholder) delete data.placeholder;
  if (meta.summary === undefined) delete data.summary;
  const yaml = stringify(data, { lineWidth: 0 }).trimEnd();
  const content = body.replace(/^\n+/, "");
  return `---\n${yaml}\n---\n\n${content.endsWith("\n") || content === "" ? content : `${content}\n`}`;
}
