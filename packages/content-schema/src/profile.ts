import { z } from "zod";

/** Icon names are keys of the ui package's icon barrel; validated by name so content stays decoupled from React. */
export const profileLink = z.object({
  label: z.string().min(1).max(40),
  url: z.url(),
  icon: z.string().regex(/^mdi[A-Z][A-Za-z0-9]+$/, "icon must be an @mdi/js export name"),
});

export const profileLinkGroup = z.object({
  title: z.string().min(1).max(40),
  links: z.array(profileLink).min(1),
});

export const profile = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1).max(120),
  bio: z.string().max(600).optional(),
  tags: z.array(z.string().min(1).max(24)).max(12).default([]),
  groups: z.array(profileLinkGroup).min(1),
  /** Marks copy that is scaffolding, not real content. Removed when real copy lands. */
  placeholder: z.boolean().default(false),
});

export type Profile = z.infer<typeof profile>;
export type ProfileLink = z.infer<typeof profileLink>;
export type ProfileLinkGroup = z.infer<typeof profileLinkGroup>;
