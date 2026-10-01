import type { Bundle } from "@crc/github-client";
import { describe, expect, it } from "vitest";
import { entriesFromBundle, mergeEntries } from "./entries.ts";

const md = (kind: string, slug: string, title: string, date: string, draft = false) =>
  `---\nkind: ${kind}\ntitle: ${title}\nslug: ${slug}\ndate: ${date}\ndraft: ${draft}\ntags: []\n---\n\nbody\n`;

const bundle: Bundle = {
  ref: "master",
  headSha: "h1",
  files: [
    {
      path: "content/posts/2026/09-18-older/index.md",
      content: md("post", "older", "Older", "2026-09-18"),
      sha: "a",
      encoding: "utf-8",
    },
    {
      path: "content/posts/2026/09-19-newer/index.md",
      content: md("post", "newer", "Newer", "2026-09-19"),
      sha: "b",
      encoding: "utf-8",
    },
    { path: "content/posts/2026/09-19-newer/hero.png", content: "", sha: "c", encoding: "base64" },
    {
      path: "content/pages/about/index.md",
      content: md("page", "about", "About", "2026-01-01"),
      sha: "d",
      encoding: "utf-8",
    },
    { path: "content/profile.yaml", content: "name: x", sha: "e", encoding: "utf-8" },
    {
      path: "content/posts/2026/09-20-broken/index.md",
      content: "---\nkind: post\nslug: BAD SLUG\n---\n",
      sha: "f",
      encoding: "utf-8",
    },
  ],
};

describe("entriesFromBundle", () => {
  it("reads posts and pages, newest first, ignoring assets and non-entries", () => {
    const entries = entriesFromBundle(bundle, "published");
    expect(entries.map((e) => e.slug)).toEqual(["newer", "older", "about"]);
    expect(entries[0]).toMatchObject({
      kind: "post",
      title: "Newer",
      dir: "content/posts/2026/09-19-newer",
      status: "published",
      ref: "master",
    });
    expect(entries.find((e) => e.slug === "about")?.kind).toBe("page");
  });

  it("skips an entry with invalid frontmatter rather than failing the whole board", () => {
    expect(entriesFromBundle(bundle, "published").some((e) => e.dir.endsWith("broken"))).toBe(
      false,
    );
  });
});

describe("mergeEntries", () => {
  const published = entriesFromBundle(bundle, "published");

  it("shows one row per slug, with the draft branch shadowing the published entry", () => {
    const rows = mergeEntries(published, [{ ref: "drafts/newer", slug: "newer", pr: null }]);
    expect(rows).toHaveLength(3);
    const newer = rows.find((r) => r.slug === "newer");
    expect(newer).toMatchObject({
      status: "draft",
      ref: "drafts/newer",
      title: "Newer",
      kind: "post",
    });
    expect(rows.filter((r) => r.slug === "newer")).toHaveLength(1);
  });

  it("marks a draft with an open pull request", () => {
    const pr = {
      number: 7,
      url: "u",
      state: "open" as const,
      merged: false,
      mergeable: true,
      headRef: "drafts/about",
    };
    const rows = mergeEntries(published, [{ ref: "drafts/about", slug: "about", pr }]);
    expect(rows.find((r) => r.slug === "about")).toMatchObject({ status: "pull-request", pr });
  });

  it("keeps a draft that has no published counterpart", () => {
    const rows = mergeEntries(published, [
      { ref: "drafts/brand-new", slug: "brand-new", pr: null },
    ]);
    const row = rows.find((r) => r.slug === "brand-new");
    expect(row).toMatchObject({ status: "draft", title: "brand-new" });
    // Nothing published under that slug, so the kind is not guessed.
    expect(row?.kind).toBeUndefined();
  });
});
