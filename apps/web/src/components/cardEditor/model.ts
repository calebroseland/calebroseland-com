import { type Profile, profile as profileSchema } from "@crc/content-schema";
import * as icons from "@crc/ui/icons";

/* The card editor's working copy of the profile. Links and groups carry a key so React keeps their
   inputs (and focus) through reordering; the keys never reach the YAML. Validation is the profile
   schema itself, mapped to field paths. */

export type EditLink = { key: string; label: string; url: string; icon: string };
export type EditGroup = { key: string; title: string; links: EditLink[] };
/** The back of the card; empty fields are left out of the file. */
type EditContact = { email: string; phone: string; location: string; locationUrl: string };
export type EditState = {
  name: string;
  tagline: string;
  tags: string[];
  groups: EditGroup[];
  contact: EditContact;
};

let seq = 0;
const key = () => `k${++seq}`;

export const MAX_TAGS = 12;

export function fromProfile(p: Profile): EditState {
  return {
    name: p.name,
    tagline: p.tagline,
    tags: [...p.tags],
    groups: p.groups.map((g) => ({
      key: key(),
      title: g.title,
      links: g.links.map((l) => ({ key: key(), ...l })),
    })),
    contact: {
      email: p.contact?.email ?? "",
      phone: p.contact?.phone ?? "",
      location: p.contact?.location?.label ?? "",
      locationUrl: p.contact?.location?.url ?? "",
    },
  };
}

function toContact(c: EditContact): Profile["contact"] {
  const email = c.email.trim();
  const phone = c.phone.trim();
  const label = c.location.trim();
  const url = c.locationUrl.trim();
  const contact: NonNullable<Profile["contact"]> = {
    ...(email && { email }),
    ...(phone && { phone }),
    ...(label && { location: { label, ...(url && { url }) } }),
  };
  return Object.keys(contact).length > 0 ? contact : undefined;
}

export function toProfile(base: Profile, s: EditState): Profile {
  const { contact: _contact, ...rest } = base;
  const contact = toContact(s.contact);
  return {
    ...rest,
    ...(contact && { contact }),
    name: s.name.trim(),
    tagline: s.tagline.trim(),
    tags: s.tags,
    groups: s.groups.map((g) => ({
      title: g.title.trim(),
      links: g.links.map(({ key: _key, ...l }) => ({
        ...l,
        label: l.label.trim(),
        url: l.url.trim(),
      })),
    })),
  };
}

export const newLink = (): EditLink => ({
  key: key(),
  label: "",
  url: "https://",
  icon: "mdiOpenInNew",
});
export const newGroup = (): EditGroup => ({ key: key(), title: "", links: [newLink()] });

/** Why a tag cannot be added, or null when it can. */
export function tagProblem(tags: readonly string[], raw: string): string | null {
  const tag = raw.trim();
  if (!tag) return "Type a focus area first.";
  if (tag.length > 24) return "Keep it to 24 characters.";
  if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return `${tag} is already there.`;
  if (tags.length >= MAX_TAGS) return `Up to ${MAX_TAGS} focus areas.`;
  return null;
}

const MESSAGES: Record<string, string> = {
  name: "The name can't be empty.",
  tagline: "Add a tagline of up to 120 characters.",
  title: "Name the group (up to 40 characters).",
  label: "Add a label of up to 40 characters.",
  url: "Use a full address (https://…) or a path on this site (/posts).",
  icon: "Pick an icon.",
  links: "A group needs at least one link.",
  email: "Use an address like name@example.com.",
  phone: "Digits, spaces and + ( ) . - only.",
  groups: "Keep at least one group.",
};

/** Field path (e.g. `groups.0.links.2.url`) → a message a person can act on. */
export function fieldErrors(p: Profile): Map<string, string> {
  const result = profileSchema.safeParse(p);
  const errors = new Map<string, string>();
  if (result.success) return errors;
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    const last = String(issue.path.at(-1) ?? "");
    if (!errors.has(path)) errors.set(path, MESSAGES[last] ?? issue.message);
  }
  return errors;
}

/** Icons a link can use: every icon in the design system's barrel, named for people. */
export const ICON_CHOICES = Object.keys(icons)
  .filter((name) => name.startsWith("mdi"))
  .sort()
  .map((name) => ({
    value: name,
    label: name.replace(/^mdi/, "").replace(/([a-z])([A-Z])/g, "$1 $2"),
  }));

export const iconPathFor = (name: string): string =>
  (icons as Record<string, string>)[name] ?? icons.mdiOpenInNew;
