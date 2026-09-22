import { z } from "zod";

/** Icon names are keys of the ui package's icon barrel; validated by name so content stays decoupled from React.
    A url is absolute, or a root-relative path to a page on this site. */
export const profileLink = z.object({
  label: z.string().min(1).max(40),
  url: z.union([
    z.url(),
    z.string().regex(/^\/(?![/\\])/, "url must be absolute or start with one /"),
  ]),
  icon: z.string().regex(/^mdi[A-Z][A-Za-z0-9]+$/, "icon must be an @mdi/js export name"),
});

/** The first link is the group's face on the collapsed card; the rest appear when it is expanded. */
export const profileLinkGroup = z.object({
  title: z.string().min(1).max(40),
  links: z.array(profileLink).min(1),
});

/** The back of the card. Each field is optional so a profile can publish only what it wants to. */
export const profileContact = z.object({
  email: z.email().optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9][0-9 ().-]{6,19}$/, "phone must be digits, spaces and + ( ) . - only")
    .optional(),
  location: z.object({ label: z.string().min(1).max(60), url: z.url().optional() }).optional(),
});

export const profile = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1).max(120),
  bio: z.string().max(600).optional(),
  tags: z.array(z.string().min(1).max(24)).max(12).default([]),
  groups: z.array(profileLinkGroup).min(1),
  contact: profileContact.optional(),
  /** Marks copy that is scaffolding, not real content. Removed when real copy lands. */
  placeholder: z.boolean().default(false),
});

export type Profile = z.infer<typeof profile>;
export type ProfileLink = z.infer<typeof profileLink>;
export type ProfileLinkGroup = z.infer<typeof profileLinkGroup>;
export type ProfileContact = z.infer<typeof profileContact>;
