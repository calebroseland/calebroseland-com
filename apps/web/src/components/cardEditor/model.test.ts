import type { Profile } from "@crc/content-schema";
import { describe, expect, it } from "vitest";
import {
  fieldErrors,
  fromProfile,
  MAX_TAGS,
  newGroup,
  newTag,
  tagProblem,
  toProfile,
} from "./model.ts";

const base: Profile = {
  name: "Someone",
  tagline: "Does things",
  tags: ["One"],
  groups: [
    { title: "Code", links: [{ label: "GitHub", url: "https://github.com/x", icon: "mdiGithub" }] },
  ],
  contact: { email: "a@b.co", location: { label: "Here", url: "https://maps.example.com" } },
  placeholder: false,
};

describe("card editor model", () => {
  it("round-trips a profile unchanged, keys and all stripped", () => {
    expect(toProfile(base, fromProfile(base))).toEqual(base);
  });

  it("trims text and drops empty contact fields, and the contact block when all are empty", () => {
    const s = fromProfile(base);
    const edited = toProfile(base, {
      ...s,
      name: "  Someone Else ",
      contact: { email: "", phone: "", location: "Elsewhere", locationUrl: "" },
    });
    expect(edited.name).toBe("Someone Else");
    expect(edited.contact).toEqual({ location: { label: "Elsewhere" } });
    const none = toProfile(base, {
      ...s,
      contact: { email: "", phone: "", location: "", locationUrl: "" },
    });
    expect(none).not.toHaveProperty("contact");
  });

  it("maps schema failures to the fields that caused them", () => {
    const s = fromProfile(base);
    const g = s.groups[0];
    if (!g?.links[0]) throw new Error("fixture");
    const bad = toProfile(base, {
      ...s,
      name: "",
      groups: [
        { ...g, links: [{ ...g.links[0], url: "nope" }] },
        { ...newGroup(), title: "" },
      ],
    });
    const errors = fieldErrors(bad);
    expect(errors.get("name")).toMatch(/can't be empty/);
    expect(errors.get("groups.0.links.0.url")).toMatch(/full address/);
    expect(errors.get("groups.1.title")).toMatch(/Name the group/);
  });

  it.each([
    ["", /Type a focus area/],
    ["one", /already there/],
    ["x".repeat(25), /24 characters/],
  ])("refuses the tag %j", (tag, message) => {
    expect(tagProblem([newTag("One")], tag)).toMatch(message);
  });

  it("caps focus areas at the schema's limit", () => {
    const full = Array.from({ length: MAX_TAGS }, (_, i) => newTag(`T${i}`));
    expect(tagProblem(full, "More")).toMatch(/Up to 12/);
    expect(tagProblem([newTag("One")], "Two")).toBeNull();
  });

  it("keeps a focus area's icon and link settings, and writes plain ones as bare labels", () => {
    const withTags = {
      ...base,
      tags: [
        "One",
        { label: "React", icon: "mdiReact", show: "icon" as const },
        { label: ".NET", link: false },
      ],
    };
    const s = fromProfile(withTags);
    expect(s.tags.map((t) => [t.label, t.icon, t.show, t.link])).toEqual([
      ["One", null, "label", true],
      ["React", "mdiReact", "icon", true],
      [".NET", null, "label", false],
    ]);
    expect(toProfile(withTags, s).tags).toEqual(withTags.tags);
  });

  it("renaming a focus area checks every other label, but not its own", () => {
    const tags = [newTag("One"), newTag("Two")];
    expect(tagProblem(tags, "one", tags[1]?.key)).toMatch(/already there/);
    expect(tagProblem(tags, "One", tags[0]?.key)).toBeNull();
  });
});
