import {
  compactTag,
  type Profile,
  profile as profileSchema,
  type ResolvedTag,
  resolveTag,
} from '@crc/content-schema';
import { type IconName, iconLabel, icons } from '@crc/ui/icons';

/* The card editor's working copy of the profile. Links and groups carry a key so React keeps their
   inputs (and focus) through reordering; the keys never reach the YAML. Validation is the profile
   schema itself, mapped to field paths. */

/** A focus area with every setting filled in (see resolveTag); written back in its shortest form. */
export type EditTag = ResolvedTag & { key: string };
export type EditLink = { key: string; label: string; url: string; icon: string };
export type EditGroup = { key: string; title: string; inline: boolean; links: EditLink[] };
/** The back of the card; empty fields are left out of the file. */
type EditContact = { email: string; phone: string; location: string; locationUrl: string };
export type EditState = {
  name: string;
  tagline: string;
  tags: EditTag[];
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
    tags: p.tags.map((t) => ({ key: key(), ...resolveTag(t) })),
    groups: p.groups.map((g) => ({
      key: key(),
      title: g.title,
      inline: g.inline ?? false,
      links: g.links.map((l) => ({ key: key(), ...l })),
    })),
    contact: {
      email: p.contact?.email ?? '',
      phone: p.contact?.phone ?? '',
      location: p.contact?.location?.label ?? '',
      locationUrl: p.contact?.location?.url ?? '',
    },
  };
}

function toContact(c: EditContact): Profile['contact'] {
  const email = c.email.trim();
  const phone = c.phone.trim();
  const label = c.location.trim();
  const url = c.locationUrl.trim();
  const contact: NonNullable<Profile['contact']> = {
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
    tags: s.tags.map(({ key: _key, ...t }) => compactTag({ ...t, label: t.label.trim() })),
    groups: s.groups.map((g) => ({
      title: g.title.trim(),
      ...(g.inline && { inline: true }),
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
  label: '',
  url: 'https://',
  icon: 'lucide:external-link',
});
export const newGroup = (): EditGroup => ({
  key: key(),
  title: '',
  inline: false,
  links: [newLink()],
});

/** Why a tag cannot be added, or null when it can. */
export const newTag = (label: string): EditTag => ({
  key: key(),
  label,
  icon: null,
  show: 'label',
  link: true,
});

/** Why a tag cannot be added (or renamed to `raw`), or null when it can. */
export function tagProblem(tags: readonly EditTag[], raw: string, except?: string): string | null {
  const tag = raw.trim();
  if (!tag) return 'Type a focus area first.';
  if (tag.length > 24) return 'Keep it to 24 characters.';
  if (tags.some((t) => t.key !== except && t.label.trim().toLowerCase() === tag.toLowerCase()))
    return `${tag} is already there.`;
  if (!except && tags.length >= MAX_TAGS) return `Up to ${MAX_TAGS} focus areas.`;
  return null;
}

const MESSAGES: Record<string, string> = {
  name: "The name can't be empty.",
  tagline: 'Add a tagline of up to 120 characters.',
  title: 'Name the group (up to 40 characters).',
  label: 'Add a label of up to 40 characters.',
  url: 'Use a full address (https://…) or a path on this site (/posts).',
  icon: 'Pick an icon.',
  links: 'A group needs at least one link.',
  email: 'Use an address like name@example.com.',
  phone: 'Digits, spaces and + ( ) . - only.',
  groups: 'Keep at least one group.',
};

/** Field path (e.g. `groups.0.links.2.url`) → a message a person can act on. */
export function fieldErrors(p: Profile): Map<string, string> {
  const result = profileSchema.safeParse(p);
  const errors = new Map<string, string>();
  if (result.success) return errors;
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    const last = String(issue.path.at(-1) ?? '');
    if (issue.path[0] === 'tags' && issue.path.length >= 2) {
      const at = `tags.${String(issue.path[1])}`;
      if (!errors.has(at)) errors.set(at, 'Give it a label of up to 24 characters.');
      continue;
    }
    if (!errors.has(path)) errors.set(path, MESSAGES[last] ?? issue.message);
  }
  return errors;
}

/** Icons a link or focus area can use: every icon in the design system's registry, named for people. */
export const ICON_CHOICES = (Object.keys(icons) as IconName[])
  .map((name) => ({ value: name, label: iconLabel(name) }))
  .sort((a, b) => a.label.localeCompare(b.label));

/** A link's place: which group, and where in it. */
export type LinkSlot = { group: number; index: number };

/** Moves a link within its group or into another; `to.index` is where it ends up. */
export function moveLink(groups: readonly EditGroup[], from: LinkSlot, to: LinkSlot): EditGroup[] {
  const link = groups[from.group]?.links[from.index];
  if (!link || !groups[to.group]) return [...groups];
  const without = groups.map((g, i) =>
    i === from.group ? { ...g, links: g.links.filter((_, j) => j !== from.index) } : g,
  );
  return without.map((g, i) => {
    if (i !== to.group) return g;
    const links = [...g.links];
    links.splice(Math.max(0, Math.min(to.index, links.length)), 0, link);
    return { ...g, links };
  });
}

/** Where the arrow keys take a link: along its group, then over the edge into the next or previous. */
export function nextLinkSlot(
  groups: readonly EditGroup[],
  from: LinkSlot,
  delta: -1 | 1,
): LinkSlot | null {
  const length = groups[from.group]?.links.length ?? 0;
  const index = from.index + delta;
  if (index >= 0 && index < length) return { group: from.group, index };
  const group = from.group + delta;
  const target = groups[group];
  if (!target) return null;
  return { group, index: delta < 0 ? target.links.length : 0 };
}
