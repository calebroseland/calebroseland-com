/* WCAG contrast from computed CSS colours, for the theme editor's readout. Browsers serialise computed
   colours as rgb() for sRGB inputs and oklch() for OKLCH ones (relative colours resolve to oklch()).
   Out-of-gamut OKLCH is clipped per channel, which is close to what the browser paints; the readout is
   an estimate, and the unit tests pin the built-in themes' numbers. */

type Rgb = readonly [number, number, number];

const num = (s: string) => (s.endsWith("%") ? Number.parseFloat(s) / 100 : Number.parseFloat(s));

function oklchToSrgb(l: number, c: number, hDeg: number): Rgb {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin: Rgb = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  const gamma = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
  return lin.map((x) => Math.min(1, Math.max(0, gamma(x)))) as unknown as Rgb;
}

/** Parses a computed colour to sRGB channels in 0–1, or null if it is not one we understand. */
export function parseColor(css: string): Rgb | null {
  const m = css.trim().match(/^(rgba?|oklch|color)\(\s*([^)]*)\)$/i);
  if (!m) return null;
  const fn = (m[1] as string).toLowerCase();
  const parts = (m[2] as string).split(/[\s,/]+/).filter(Boolean);
  if (fn === "color") {
    if (parts[0] !== "srgb") return null;
    const [r, g, b] = parts.slice(1, 4).map(num);
    return r === undefined || g === undefined || b === undefined ? null : [r, g, b];
  }
  const [x, y, z] = parts.slice(0, 3).map((p) => (p === "none" ? 0 : num(p)));
  if (x === undefined || y === undefined || z === undefined || [x, y, z].some(Number.isNaN))
    return null;
  return fn === "oklch" ? oklchToSrgb(x, y, z) : [x / 255, y / 255, z / 255];
}

const luminance = ([r, g, b]: Rgb) => {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

export function contrastRatio(fg: Rgb, bg: Rgb): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((p, q) => q - p) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
