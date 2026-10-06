import { type Entry, entry } from '@crc/content-schema';
import { parse, stringify } from 'yaml';

/* Frontmatter split and join on `---` fences. Hand-rolled over gray-matter because that package reaches
   for Node's Buffer and this code also runs in the editor (browser). */

export type ParsedEntry = { meta: Entry; body: string };

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function splitFrontmatter(text: string): { data: unknown; body: string } {
  const m = FENCE.exec(text);
  if (!m) return { data: {}, body: text };
  return { data: parse(m[1] ?? '') ?? {}, body: text.slice(m[0].length) };
}

/** Splits frontmatter from body and validates the frontmatter. Throws a ZodError naming the field. */
export function parseEntry(text: string): ParsedEntry {
  const { data, body } = splitFrontmatter(text);
  return { meta: entry.parse(data), body };
}

/** Inverse of parseEntry. Dates serialize as YYYY-MM-DD; defaults are written explicitly so the file is self-describing. */
/* A fixed key order, so editing a hand-written file in the editor produces a minimal diff rather than
   reshuffling its frontmatter. Unknown keys keep their original position at the end. */
const KEY_ORDER = ['kind', 'title', 'slug', 'date', 'draft', 'tags', 'summary'];

export function serializeEntry({ meta, body }: ParsedEntry): string {
  const source: Record<string, unknown> = { ...meta, date: meta.date.toISOString().slice(0, 10) };
  const data: Record<string, unknown> = {};
  for (const key of KEY_ORDER) if (key in source) data[key] = source[key];
  for (const key of Object.keys(source)) if (!(key in data)) data[key] = source[key];
  if (meta.summary === undefined) delete data.summary;
  const yaml = stringify(data, { lineWidth: 0 }).trimEnd();
  const content = body.replace(/^\n+/, '');
  return `---\n${yaml}\n---\n\n${content.endsWith('\n') || content === '' ? content : `${content}\n`}`;
}
