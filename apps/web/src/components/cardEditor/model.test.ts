import type { Profile } from "@crc/content-schema";
import { describe, expect, it } from "vitest";
import {
  fieldErrors,
  fromProfile,
  MAX_TAGS,
  moveLink,
  newGroup,
  newTag,
  nextLinkSlot,
  tagProblem,
  toProfile,
} from "./model.ts";

const base: Profile = {
  name: "Someone",
  tagline: "Does things",
  tags: ["One"],
  groups: [
    {
      title: "Code",
      links: [{ label: "GitHub", url: "https://github.com/x", icon: "simple-icons:github" }],
    },
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
        { label: "React", icon: "simple-icons:react", show: "icon" as const },
        { label: ".NET", link: false },
      ],
    };
    const s = fromProfile(withTags);
    expect(s.tags.map((t) => [t.label, t.icon, t.show, t.link])).toEqual([
      ["One", null, "label", true],
      ["React", "simple-icons:react", "icon", true],
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

describe("moving links", () => {
  const link = (label: string) => ({
    key: label,
    label,
    url: "https://x.test",
    icon: "lucide:link",
  });
  const groups = [
    { key: "a", title: "A", inline: false, links: [link("a1"), link("a2")] },
    { key: "b", title: "B", inline: false, links: [link("b1")] },
  ];
  const labels = (gs: readonly { links: { label: string }[] }[]) =>
    gs.map((g) => g.links.map((l) => l.label));

  it("reorders within a group and moves into another at the given place", () => {
    expect(labels(moveLink(groups, { group: 0, index: 0 }, { group: 0, index: 1 }))).toEqual([
      ["a2", "a1"],
      ["b1"],
    ]);
    expect(labels(moveLink(groups, { group: 0, index: 1 }, { group: 1, index: 0 }))).toEqual([
      ["a1"],
      ["a2", "b1"],
    ]);
    expect(labels(moveLink(groups, { group: 1, index: 0 }, { group: 0, index: 2 }))).toEqual([
      ["a1", "a2", "b1"],
      [],
    ]);
  });

  it("steps over a group's edge with the arrow keys, and stops at the ends", () => {
    expect(nextLinkSlot(groups, { group: 0, index: 0 }, 1)).toEqual({ group: 0, index: 1 });
    expect(nextLinkSlot(groups, { group: 0, index: 1 }, 1)).toEqual({ group: 1, index: 0 });
    expect(nextLinkSlot(groups, { group: 1, index: 0 }, -1)).toEqual({ group: 0, index: 2 });
    expect(nextLinkSlot(groups, { group: 0, index: 0 }, -1)).toBeNull();
    expect(nextLinkSlot(groups, { group: 1, index: 0 }, 1)).toBeNull();
  });
});
