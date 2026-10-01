import data from "virtual:content/theme";
import type { ThemeFonts } from "@crc/content-schema/fonts";

/** The default theme's faces (content/theme.yaml), which a new custom theme starts from. */
export const siteFonts: ThemeFonts = data.fonts;
