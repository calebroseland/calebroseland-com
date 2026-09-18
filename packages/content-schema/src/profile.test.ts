import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseYaml } from "./load.ts";
import { profile, profileLink } from "./profile.ts";

const validLink = { label: "GitHub", url: "https://github.com/calebroseland", icon: "mdiGithub" };

describe("profileLink", () => {
  it("accepts a well-formed link", () => {
    expect(profileLink.parse(validLink)).toEqual(validLink);
  });

  it.each([
    ["empty label", { ...validLink, label: "" }],
    ["relative url", { ...validLink, url: "/local" }],
    ["icon not an mdi export name", { ...validLink, icon: "github" }],
    ["icon with spaces", { ...validLink, icon: "mdi Github" }],
  ])("rejects %s", (_name, input) => {
    expect(profileLink.safeParse(input).success).toBe(false);
  });

  it("accepts any https url with an mdi-style icon name", () => {
    fc.assert(
      fc.property(fc.webUrl({ validSchemes: ["https"] }), (url) => {
        expect(profileLink.safeParse({ ...validLink, url }).success).toBe(true);
      }),
    );
  });
});

describe("profile", () => {
  const validProfile = {
    name: "Caleb Roseland",
    tagline: "Placeholder tagline",
    groups: [{ title: "Code", links: [validLink] }],
  };

  it("applies defaults for tags and placeholder", () => {
    const parsed = profile.parse(validProfile);
    expect(parsed.tags).toEqual([]);
    expect(parsed.placeholder).toBe(false);
  });

  it("requires at least one group with one link", () => {
    expect(profile.safeParse({ ...validProfile, groups: [] }).success).toBe(false);
    expect(
      profile.safeParse({ ...validProfile, groups: [{ title: "x", links: [] }] }).success,
    ).toBe(false);
  });

  it("names the failing path when YAML is invalid", () => {
    const yaml = `name: Caleb\ntagline: x\ngroups:\n  - title: Code\n    links:\n      - label: GitHub\n        url: not-a-url\n        icon: mdiGithub\n`;
    expect(() => parseYaml(profile, yaml)).toThrowError(/groups.*0.*links.*0.*url/s);
  });
});
