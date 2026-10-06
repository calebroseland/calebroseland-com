/* The faces a theme may name. Proxima Nova and Cortado are licensed through Adobe Fonts and served only
   from its CDN, so the kit is loaded only while the theme in use names one of them. No zod here: the
   site shell imports this. */

/** The Adobe Fonts kit holding Proxima Nova and Cortado; licensed per domain in the kit. */
export const ADOBE_KIT = 'https://use.typekit.net/mgx3xhc.css';

export const FONTS = {
  proxima: {
    label: 'Proxima Nova',
    stack: '"proxima-nova", "Helvetica Neue", Helvetica, ui-sans-serif, system-ui, sans-serif',
    adobe: true,
  },
  system: {
    label: 'System',
    stack: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    adobe: false,
  },
  serif: {
    label: 'IBM Plex Serif',
    stack: '"IBM Plex Serif", ui-serif, Georgia, serif',
    adobe: false,
  },
  mono: {
    label: 'IBM Plex Mono',
    stack: '"IBM Plex Mono", ui-monospace, SFMono-Regular, monospace',
    adobe: false,
  },
  cortado: { label: 'Cortado', stack: '"cortado", "Brush Script MT", cursive', adobe: true },
} as const;
export type FontId = keyof typeof FONTS;
export const TEXT_FONTS = [
  'proxima',
  'system',
  'serif',
  'mono',
] as const satisfies readonly FontId[];
/** The name: its own face, or the text font ("text"). */
export const NAME_FONTS = ['cortado', 'text', 'serif'] as const;
/** Post and page body text: serif by default, the text font, or any text face. */
export const READING_FONTS = ['serif', 'text', 'proxima', 'system', 'mono'] as const;

export type ThemeFonts = {
  text: (typeof TEXT_FONTS)[number];
  name: (typeof NAME_FONTS)[number];
  reading: (typeof READING_FONTS)[number];
};

/** Today's faces, used where content/theme.yaml says nothing. */
export const DEFAULT_FONTS: ThemeFonts = { text: 'proxima', name: 'cortado', reading: 'serif' };

const resolve = (fonts: ThemeFonts) => ({
  text: fonts.text,
  name: fonts.name === 'text' ? fonts.text : fonts.name,
  reading: fonts.reading === 'text' ? fonts.text : fonts.reading,
});

/** The CSS custom properties that put a theme's faces on the page. */
export const fontVars = (fonts: ThemeFonts): Record<string, string> => {
  const r = resolve(fonts);
  return {
    '--font-sans': FONTS[r.text].stack,
    '--font-brand': FONTS[r.name].stack,
    '--font-prose': FONTS[r.reading].stack,
  };
};

/** Whether the faces include one only the Adobe Fonts kit serves. */
export const usesAdobeFonts = (fonts: ThemeFonts): boolean => {
  return Object.values(resolve(fonts)).some((id) => FONTS[id].adobe);
};
