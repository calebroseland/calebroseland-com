import { readFileSync } from 'node:fs';
import { clampChroma, converter, wcagContrast } from 'culori';
import { describe, expect, it } from 'vitest';

/* Resolves the semantic token graph per theme and asserts WCAG AA on every text/background pairing.
   OKLCH lightness is a proxy, not a guarantee; this is the guarantee. */

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const primitives = read('./tokens/primitives.css');
const themes = { light: read('./tokens/themes/light.css'), dark: read('./tokens/themes/dark.css') };

const declarations = (css: string): Map<string, string> => {
  const out = new Map<string, string>();
  for (const m of css.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) {
    // primitives.css declares durations twice (reduced motion); first wins, which is the base block
    if (!out.has(m[1] as string)) {
      out.set(m[1] as string, (m[2] as string).trim());
    }
  }
  return out;
};

const resolve = (vars: Map<string, string>, value: string, depth = 0): string => {
  if (depth > 20) {
    throw new Error(`token cycle at ${value}`);
  }
  return value.replace(/var\((--[a-z0-9-]+)\)/g, (_, name: string) => {
    const v = vars.get(name);
    if (v === undefined) {
      throw new Error(`unresolved ${name}`);
    }
    return resolve(vars, v, depth + 1);
  });
};

// Browsers gamut-map OKLCH to sRGB before painting, so measure the clipped colour, as axe does.
const toRgb = (c: string) => clampChroma(converter('rgb')(c), 'rgb');
const contrast = (vars: Map<string, string>, fg: string, bg: string): number => {
  const f = toRgb(resolve(vars, `var(${fg})`));
  const b = toRgb(resolve(vars, `var(${bg})`));
  if (!f || !b) {
    throw new Error(`could not parse ${fg} or ${bg}`);
  }
  return wcagContrast(f, b);
};

const bodyPairs: Array<[string, string]> = [
  ['--color-text', '--color-bg'],
  ['--color-text', '--color-surface'],
  ['--color-text', '--color-surface-raised'],
  ['--color-text-muted', '--color-bg'],
  ['--color-text-muted', '--color-surface'],
  ['--color-link', '--color-bg'],
  ['--color-link', '--color-surface'],
  ['--color-text-on-accent', '--color-accent'],
  ['--color-accent-text', '--color-accent-subtle'],
  ['--color-danger', '--color-danger-subtle'],
  ['--color-text-inverted', '--color-danger'],
  ['--color-text-inverted', '--color-danger-hover'],
  ['--color-success', '--color-success-subtle'],
  ['--color-warning', '--color-warning-subtle'],
];
/* Non-text contrast (WCAG 1.4.11) applies to boundaries a user must perceive: the focus ring and
   any control whose only visual boundary is a border. Plain --color-border* tokens are decorative
   and always paired with another cue, so they are deliberately not in this list. */
const uiPairs: Array<[string, string]> = [
  ['--color-focus-ring', '--color-bg'],
  ['--color-focus-ring', '--color-surface'],
  ['--color-text-subtle', '--color-bg'],
  ['--color-accent', '--color-bg'],
  ['--color-accent', '--color-surface'],
];

describe.each(Object.entries(themes))('%s theme', (_name, themeCss) => {
  const vars = new Map([...declarations(primitives), ...declarations(themeCss)]);

  it.each(bodyPairs)('%s on %s ≥ 4.5:1', (fg, bg) => {
    expect(contrast(vars, fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(uiPairs)('%s on %s ≥ 3:1', (fg, bg) => {
    expect(contrast(vars, fg, bg)).toBeGreaterThanOrEqual(3);
  });
});
