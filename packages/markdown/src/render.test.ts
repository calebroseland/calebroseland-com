import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseEntry, serializeEntry } from "./frontmatter.ts";
import { renderMarkdown } from "./render.ts";

const fixture = readFileSync(new URL("./__fixtures__/kitchen-sink.md", import.meta.url), "utf8");

describe("parseEntry / serializeEntry", () => {
  it("parses frontmatter and body", () => {
    const { meta, body } = parseEntry(fixture);
    expect(meta.kind).toBe("post");
    expect(meta.slug).toBe("kitchen-sink");
    expect(meta.date.toISOString()).toBe("2026-09-18T00:00:00.000Z");
    expect(body).toContain("# Heading one");
  });

  it("round-trips through serialize", () => {
    const first = parseEntry(fixture);
    const second = parseEntry(serializeEntry(first));
    expect(second.meta).toEqual(first.meta);
    expect(second.body.trim()).toBe(first.body.trim());
  });

  it("names the invalid field", () => {
    expect(() =>
      parseEntry("---\nkind: post\ntitle: x\nslug: Bad Slug\ndate: 2026-01-01\n---\n"),
    ).toThrowError(/slug/);
  });
});

describe("renderMarkdown", () => {
  // The first render loads every highlighter grammar, which can pass the 5s default on a busy machine.
  it("matches the golden output", async () => {
    const { body } = parseEntry(fixture);
    const { html } = await renderMarkdown(body, { resolveImage: (s) => `/resolved/${s}` });
    await expect(html).toMatchFileSnapshot("./__fixtures__/kitchen-sink.golden.html");
  }, 30_000);

  it("strips scripts and event handlers", async () => {
    const { html } = await renderMarkdown(parseEntry(fixture).body);
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("alert(");
  });

  it("collects relative images, headings, and rewrites image src", async () => {
    const { images, headings, html } = await renderMarkdown(parseEntry(fixture).body, {
      resolveImage: (s) => `/assets/${s}`,
    });
    expect(images).toEqual(["hero.jpg"]);
    expect(html).toContain('src="/assets/hero.jpg"');
    expect(headings).toEqual([
      { depth: 1, id: "heading-one", text: "Heading one" },
      { depth: 2, id: "heading-two", text: "Heading two" },
    ]);
  });

  it("highlights code with both theme variables and a language class", async () => {
    const { html } = await renderMarkdown("```ts\nconst a = 1;\n```\n");
    expect(html).toContain("--shiki-dark");
    expect(html).toContain("language-ts");
  });

  it("opens external links in a new tab with rel noopener", async () => {
    const { html } = await renderMarkdown("[x](https://example.com) and [y](/local)");
    expect(html).toContain('href="https://example.com" rel="noopener noreferrer" target="_blank"');
    expect(html).toContain('href="/local"');
    expect(html).not.toMatch(/href="\/local"[^>]*target/);
  });
});

describe("retired frontmatter", () => {
  it("still loads a file with the old placeholder flag, and saving it drops the flag", () => {
    const old =
      "---\nkind: page\ntitle: About\nslug: about\ndate: 2026-09-18\ndraft: false\nplaceholder: true\n---\n\nHello\n";
    const parsed = parseEntry(old);
    expect(parsed.meta.title).toBe("About");
    expect(serializeEntry(parsed)).not.toContain("placeholder");
  });
});

describe("serializeEntry output", () => {
  it("writes a fenced YAML block GitHub renders, with the date as YYYY-MM-DD", () => {
    const out = serializeEntry({
      meta: {
        kind: "post",
        title: "T",
        slug: "t",
        date: new Date("2026-09-18T00:00:00Z"),
        draft: true,
        tags: ["a"],
      },
      body: "\n\n# Body",
    });
    expect(out).toBe(
      "---\nkind: post\ntitle: T\nslug: t\ndate: 2026-09-18\ndraft: true\ntags:\n  - a\n---\n\n# Body\n",
    );
    expect(parseEntry(out).body.trim()).toBe("# Body");
  });
});

describe("frontmatter key order", () => {
  it("is fixed, so editing a hand-written file does not reshuffle its frontmatter", () => {
    const original =
      "---\ntitle: T\nslug: t\ndate: 2026-09-18\ndraft: false\ntags: []\nkind: post\n---\n\nbody\n";
    const round = serializeEntry(parseEntry(original));
    expect(round.split("\n").slice(1, 7)).toEqual([
      "kind: post",
      "title: T",
      "slug: t",
      "date: 2026-09-18",
      "draft: false",
      "tags: []",
    ]);
    // Rewriting the result again changes nothing.
    expect(serializeEntry(parseEntry(round))).toBe(round);
  });
});
