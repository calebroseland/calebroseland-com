/* The site renders in the browser, so React's first render is the first time any text is drawn. Waiting
   for the theme's text faces before it means text is never drawn in a fallback and then swapped: a
   swap re-wraps every paragraph and resizes the column (it is measured in `ch`, the font's own width),
   moving everything below. The wait is capped, so a slow or failing font never keeps the page blank. */

const LIMIT_MS = 3000;

// The theme's text: body and headings (sans) and long-form reading (prose), as the theme set them.
const TEXT_STACKS = ['--font-prose', '--font-sans'];
// Regular, bold and italic: each is its own file, and each changes how lines wrap.
const STYLES = ['400', '600', 'italic 400'];

const GENERIC =
  /^(?:serif|sans-serif|monospace|cursive|fantasy|math|emoji|fangsong|system-ui|-apple-system|ui-(?:serif|sans-serif|monospace|rounded))$/i;

/** The first family of a font stack, unquoted, or null when it is a generic family the platform supplies. */
export const primaryFamily = (stack: string): string | null => {
  const first =
    stack
      .split(',')[0]
      ?.trim()
      .replace(/^["']|["']$/g, '') ?? '';
  return first && !GENERIC.test(first) ? first : null;
};

/** Resolves once the theme's text faces have loaded, or after the limit, whichever comes first. */
export const waitForThemeFonts = (): Promise<void> => {
  if (typeof document === 'undefined' || !document.fonts) {
    return Promise.resolve();
  }
  const root = getComputedStyle(document.documentElement);
  const families = new Set(
    TEXT_STACKS.map((v) => primaryFamily(root.getPropertyValue(v))).filter((f) => f !== null),
  );
  const faces = [...families].flatMap((family) => STYLES.map((s) => `${s} 1em "${family}"`));
  const missing = faces.filter((face) => !document.fonts.check(face));
  if (missing.length === 0) {
    return Promise.resolve();
  }
  const loaded = Promise.all(missing.map((face) => document.fonts.load(face))).then(
    () => undefined,
    () => undefined,
  );
  const limit = new Promise<void>((resolve) => setTimeout(resolve, LIMIT_MS));
  return Promise.race([loaded, limit]);
};
