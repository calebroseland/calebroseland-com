import index, { loaders } from "virtual:content/index";
import type { EntryMeta } from "@crc/content-schema";

export type { EntryMeta };
export type LoadedEntry = {
  meta: EntryMeta;
  html: string;
  headings: Array<{ depth: number; id: string; text: string }>;
};

const entries: readonly EntryMeta[] = index;
export const posts = entries.filter((e) => e.kind === "post");
export const pages = entries.filter((e) => e.kind === "page");

export const allTags = [...new Set(posts.flatMap((p) => p.tags))].sort();

export function findBySlug(kind: EntryMeta["kind"], slug: string): EntryMeta | undefined {
  return entries.find((e) => e.kind === kind && e.slug === slug);
}

/** Each entry is its own lazy module so a post's HTML only loads on its route. */
export async function loadEntry(id: string): Promise<LoadedEntry> {
  const load = loaders[id];
  if (!load) throw new Error(`no content entry ${id}`);
  return (await load()).default;
}

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(iso));
