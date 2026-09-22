import * as z from "zod/mini";

/* A custom theme re-points primitives over the light or dark semantic layer, so the contrast structure
   of the built-in themes (which step carries text, which carries surfaces) still holds. Each control is
   clamped to the range where the design system stays coherent; see RANGES. */

export const FONTS = {
  proxima: {
    label: "Proxima Nova",
    stack: '"proxima-nova", "Helvetica Neue", Helvetica, ui-sans-serif, system-ui, sans-serif',
  },
  system: {
    label: "System",
    stack: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  serif: { label: "IBM Plex Serif", stack: '"IBM Plex Serif", ui-serif, Georgia, serif' },
  mono: {
    label: "IBM Plex Mono",
    stack: '"IBM Plex Mono", ui-monospace, SFMono-Regular, monospace',
  },
  cortado: { label: "Cortado", stack: '"cortado", "Brush Script MT", cursive' },
} as const;
export type FontId = keyof typeof FONTS;
export const TEXT_FONTS = [
  "proxima",
  "system",
  "serif",
  "mono",
] as const satisfies readonly FontId[];
export const NAME_FONTS = ["cortado", "text", "serif"] as const;

export const RANGES = {
  neutralTint: { min: 0, max: 0.04, step: 0.002 },
  textScale: { min: 0.9, max: 1.2, step: 0.025 },
  leading: { min: 1.4, max: 1.8, step: 0.05 },
  spaceScale: { min: 0.8, max: 1.3, step: 0.05 },
  radiusScale: { min: 0, max: 2, step: 0.1 },
  measure: { min: 60, max: 80, step: 2 },
  shadowScale: { min: 0, max: 2, step: 0.1 },
} as const;
type RangeKey = keyof typeof RANGES;

const clampTo = (key: RangeKey) => {
  const { min, max } = RANGES[key];
  return (v: number) => Math.min(max, Math.max(min, v));
};

const hex = z.string().check(z.regex(/^#[0-9a-f]{6}$/i));
const ranged = (key: RangeKey) => z.pipe(z.number(), z.transform(clampTo(key)));

export const customTheme = z.object({
  id: z.string().check(z.minLength(1)),
  name: z.string().check(z.minLength(1), z.maxLength(40)),
  base: z.enum(["light", "dark"]),
  accent: hex,
  neutralHue: z.pipe(
    z.number(),
    z.transform((h) => ((h % 360) + 360) % 360),
  ),
  neutralTint: ranged("neutralTint"),
  backdrop: z.nullable(hex),
  fontText: z.enum(TEXT_FONTS),
  fontName: z.enum(NAME_FONTS),
  textScale: ranged("textScale"),
  leading: ranged("leading"),
  spaceScale: ranged("spaceScale"),
  radiusScale: ranged("radiusScale"),
  measure: ranged("measure"),
  shadowScale: ranged("shadowScale"),
});
export type CustomTheme = z.infer<typeof customTheme>;

/** Today's look: Open Color blue and gray, the built-in faces, every scale at 1. */
export function defaultTheme(base: "light" | "dark", id: string, name: string): CustomTheme {
  return {
    id,
    name,
    base,
    accent: "#228be6",
    neutralHue: 248,
    neutralTint: 0.015,
    backdrop: null,
    fontText: "proxima",
    fontName: "cortado",
    textScale: 1,
    leading: 1.5,
    spaceScale: 1,
    radiusScale: 1,
    measure: 68,
    shadowScale: 1,
  };
}

/* Lightness of each ramp step is today's Open Color value, so the step that carries text keeps its
   contrast. Chroma is the step's share of the ramp's peak, applied to the picked colour's (capped). */
const ACCENT_STEPS: ReadonlyArray<[string, number, number]> = [
  ["50", 0.963, 0.122],
  ["100", 0.927, 0.238],
  ["200", 0.86, 0.463],
  ["300", 0.782, 0.701],
  ["400", 0.718, 0.866],
  ["500", 0.669, 0.957],
  ["600", 0.626, 1],
  ["700", 0.586, 0.97],
  ["800", 0.543, 0.909],
  ["900", 0.497, 0.811],
  ["950", 0.3, 0.457],
  ["1000", 0.194, 0.238],
];
const ACCENT_MAX_CHROMA = 0.19;

const GRAY_STEPS: ReadonlyArray<[string, number, number]> = [
  ["50", 0.982, 0.133],
  ["100", 0.963, 0.2],
  ["200", 0.942, 0.333],
  ["300", 0.911, 0.467],
  ["400", 0.867, 0.733],
  ["500", 0.769, 1],
  ["600", 0.643, 1],
  ["700", 0.428, 1],
  ["800", 0.345, 0.867],
  ["900", 0.262, 0.6],
  ["950", 0.19, 0.467],
];

const FONT_SIZES: Record<string, string> = {
  xs: "0.75rem",
  sm: "0.875rem",
  base: "1rem",
  md: "1.125rem",
  lg: "1.25rem",
  xl: "1.5rem",
  "2xl": "1.875rem",
  "3xl": "2.25rem",
  "4xl": "3rem",
  "display-sm": "clamp(1.875rem, 1.45rem + 2.1vw, 3rem)",
  "display-md": "clamp(2.25rem, 1.55rem + 3.5vw, 4.5rem)",
};
const SPACES: Record<string, number> = {
  "1": 0.25,
  "2": 0.5,
  "3": 0.75,
  "4": 1,
  "5": 1.25,
  "6": 1.5,
  "8": 2,
  "10": 2.5,
  "12": 3,
  "16": 4,
  "20": 5,
  "24": 6,
  "32": 8,
};
const RADII: Record<string, number> = { xs: 2, sm: 4, md: 6, lg: 10, xl: 16 };

const round = (n: number, places = 4) => Number(n.toFixed(places));

function shadows(base: "light" | "dark", s: number): Record<string, string> {
  if (s === 0) return { "--shadow-sm": "none", "--shadow-md": "none", "--shadow-lg": "none" };
  const ink = base === "light" ? "var(--gray-950)" : "var(--black)";
  const layer = (y: number, blur: number, alpha: number) =>
    `0 ${round(y * s, 2)}px ${round(blur * s, 2)}px oklch(from ${ink} l c h / ${round(Math.min(1, alpha * s), 3)})`;
  return base === "light"
    ? {
        "--shadow-sm": layer(1, 2, 0.06),
        "--shadow-md": `${layer(2, 4, 0.06)}, ${layer(4, 12, 0.08)}`,
        "--shadow-lg": `${layer(4, 8, 0.08)}, ${layer(12, 32, 0.12)}`,
      }
    : {
        "--shadow-sm": layer(1, 2, 0.3),
        "--shadow-md": layer(2, 8, 0.4),
        "--shadow-lg": layer(8, 24, 0.5),
      };
}

/** The CSS custom properties a theme sets on <html>, on top of its base's semantic layer. */
export function themeVars(t: CustomTheme): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [step, l, k] of ACCENT_STEPS)
    vars[`--accent-${step}`] =
      `oklch(from ${t.accent} ${l} calc(min(c, ${ACCENT_MAX_CHROMA}) * ${k}) h)`;
  for (const [step, l, k] of GRAY_STEPS)
    vars[`--gray-${step}`] = `oklch(${l} ${round(t.neutralTint * k)} ${round(t.neutralHue, 1)})`;
  if (t.backdrop) vars["--color-backdrop"] = t.backdrop;

  vars["--font-sans"] = FONTS[t.fontText].stack;
  vars["--font-brand"] = t.fontName === "text" ? FONTS[t.fontText].stack : FONTS[t.fontName].stack;

  for (const [name, size] of Object.entries(FONT_SIZES))
    vars[`--font-size-${name}`] = t.textScale === 1 ? size : `calc(${size} * ${t.textScale})`;
  vars["--leading-normal"] = String(t.leading);
  vars["--leading-relaxed"] = String(round(t.leading + 0.15, 2));
  for (const [name, rem] of Object.entries(SPACES))
    vars[`--space-${name}`] = `${round(rem * t.spaceScale)}rem`;
  for (const [name, px] of Object.entries(RADII))
    vars[`--radius-${name}`] = `${round(px * t.radiusScale, 1)}px`;
  vars["--measure-narrow"] = `${t.measure - 16}ch`;
  vars["--measure"] = `${t.measure}ch`;
  vars["--measure-wide"] = `${t.measure + 12}ch`;
  Object.assign(vars, shadows(t.base, t.shadowScale));
  return vars;
}
