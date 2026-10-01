import { z } from "zod";

const iconName = z
  .string()
  .regex(
    /^(lucide|simple-icons):[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "icon must be an Iconify name (lucide:… or simple-icons:…)",
  );

/** Icon names are keys of the ui package's icon barrel; validated by name so content stays decoupled from React.
    A url is absolute, or a root-relative path to a page on this site. */
export const profileLink = z.object({
  label: z.string().min(1).max(40),
  url: z.union([
    z.url(),
    z.string().regex(/^\/(?![/\\])/, "url must be absolute or start with one /"),
  ]),
  icon: iconName,
});

/** A focus area. The short form is just its label: shown as text, linking to its posts. The long form
    adds an icon, chooses what the chip shows, or turns the link off. */
export const profileTag = z.union([
  z.string().min(1).max(24),
  z.object({
    label: z.string().min(1).max(24),
    icon: iconName.optional(),
    show: z.enum(["icon", "label", "both"]).optional(),
    link: z.boolean().optional(),
  }),
]);

export type ProfileTag = z.infer<typeof profileTag>;
export type ResolvedTag = {
  label: string;
  icon: string | null;
  show: "icon" | "label" | "both";
  link: boolean;
};

/** Either form, with defaults filled in: no icon means text only, and a chip links unless told not to. */
export function resolveTag(tag: ProfileTag): ResolvedTag {
  if (typeof tag === "string") return { label: tag, icon: null, show: "label", link: true };
  const icon = tag.icon ?? null;
  return {
    label: tag.label,
    icon,
    show: icon ? (tag.show ?? "both") : "label",
    link: tag.link ?? true,
  };
}

/** The shortest form that means the same thing, so profile.yaml stays readable. */
export function compactTag(tag: ResolvedTag): ProfileTag {
  const show = tag.icon && tag.show !== "both" ? tag.show : undefined;
  if (!tag.icon && tag.link) return tag.label;
  return {
    label: tag.label,
    ...(tag.icon && { icon: tag.icon }),
    ...(show && { show }),
    ...(!tag.link && { link: false }),
  };
}

export const tagLabel = (tag: ProfileTag): string => (typeof tag === "string" ? tag : tag.label);

/** The first link is the group's face on the collapsed card; the rest appear when it is expanded. An
    inline group is one row of icons, each named by a tooltip, and shows all of them either way. */
export const profileLinkGroup = z.object({
  title: z.string().min(1).max(40),
  links: z.array(profileLink).min(1),
  inline: z.boolean().optional(),
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
  tags: z.array(profileTag).max(12).default([]),
  groups: z.array(profileLinkGroup).min(1),
  contact: profileContact.optional(),
});

export type Profile = z.infer<typeof profile>;
export type ProfileLink = z.infer<typeof profileLink>;
export type ProfileLinkGroup = z.infer<typeof profileLinkGroup>;
export type ProfileContact = z.infer<typeof profileContact>;
