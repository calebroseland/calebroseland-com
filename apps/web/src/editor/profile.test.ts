import { readFileSync } from "node:fs";
import { type Profile, profile as profileSchema } from "@crc/content-schema";
import { createFakeClient, StaleRefError } from "@crc/github-client";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { loadProfile, PROFILE_REF, saveProfile, serializeProfile } from "./profile.ts";

const sourceYaml = readFileSync(
  new URL("../../fixtures/content/profile.yaml", import.meta.url),
  "utf8",
);
const published: Profile = profileSchema.parse(parse(sourceYaml));

describe("serializeProfile", () => {
  // The yaml library writes every flow collection with inner padding, so a file already in that
  // style comes back byte for byte; content/profile.yaml's tags line adopts it on its first save.
  it("round-trips a file byte for byte when nothing changed", () => {
    const file = `# Heading comment.
name: Someone
tagline: Does things
tags: [ One, Two ]
groups:
  - title: Code
    links:
      - { label: GitHub, url: https://github.com/x, icon: simple-icons:github }
`;
    expect(serializeProfile(file, profileSchema.parse(parse(file)))).toBe(file);
  });

  it("keeps the leading comment and one-line links when the content changes", () => {
    const next = { ...published, tagline: "Engineer", tags: [...published.tags, "Rust"] };
    const out = serializeProfile(sourceYaml, next);
    expect(out.startsWith("# ")).toBe(true);
    expect(out).toContain("tagline: Engineer");
    expect(out).toMatch(/tags: \[.*Rust ]/);
    expect(out).toMatch(
      /- \{ label: GitHub, url: https:\/\/github\.com\/calebroseland, icon: simple-icons:github }/,
    );
    expect(profileSchema.parse(parse(out))).toEqual(next);
  });

  it("writes a fresh file when there was none, in the same one-line style", () => {
    const out = serializeProfile("", published);
    expect(profileSchema.parse(parse(out))).toEqual(published);
    expect(out).toMatch(/^tags: \[ /m);
    expect(out).toMatch(/^ {6}- \{ label: GitHub, /m);
  });
});

describe("loadProfile and saveProfile", () => {
  it("starts from the fallback, creates drafts/profile on first save, then reads the draft back", async () => {
    const gh = createFakeClient();
    const first = await loadProfile(gh, published);
    expect(first.profile).toEqual(published);
    expect(first.branchExists).toBe(false);

    const saved = await saveProfile(gh, first, { ...published, name: "Someone" }, "profile: edit");
    expect(saved.ref).toBe(PROFILE_REF);
    expect((await gh.listDrafts()).map((d) => d.ref)).toContain(PROFILE_REF);

    const again = await loadProfile(gh, published);
    expect(again.profile.name).toBe("Someone");
    expect(again.headSha).toBe(saved.headSha);
  });

  it("refuses to overwrite a draft that moved since it was read", async () => {
    const gh = createFakeClient();
    const a = await saveProfile(gh, await loadProfile(gh, published), published, "one");
    const stale = { ...a, headSha: "not-the-head" };
    await expect(saveProfile(gh, stale, published, "two")).rejects.toBeInstanceOf(StaleRefError);
  });

  it("rejects an invalid profile before writing anything", async () => {
    const gh = createFakeClient();
    const source = await loadProfile(gh, published);
    await expect(saveProfile(gh, source, { ...published, name: "" }, "bad")).rejects.toThrow();
    expect(await gh.listDrafts()).toEqual([]);
  });
});
