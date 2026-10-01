import { z } from "zod";
import { DEFAULT_FONTS, NAME_FONTS, READING_FONTS, TEXT_FONTS } from "./fonts.ts";

/** The site's default theme (content/theme.yaml); every field falls back to today's faces. */
export const siteTheme = z.object({
  fonts: z
    .object({
      text: z.enum(TEXT_FONTS).default(DEFAULT_FONTS.text),
      name: z.enum(NAME_FONTS).default(DEFAULT_FONTS.name),
      reading: z.enum(READING_FONTS).default(DEFAULT_FONTS.reading),
    })
    .prefault({}),
});
export type SiteTheme = z.output<typeof siteTheme>;
