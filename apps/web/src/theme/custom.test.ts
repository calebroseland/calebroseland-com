import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { customTheme, defaultTheme, RANGES, themeVars } from './custom.ts';

const primitives = readFileSync(
  new URL('../../../../packages/ui/src/tokens/primitives.css', import.meta.url),
  'utf8',
);
const primitive = (name: string) =>
  primitives.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim();

describe('themeVars', () => {
  const vars = themeVars(defaultTheme('light', 't', 'Mine'));

  it("at defaults, reproduces today's type, spacing, radius and measure primitives", () => {
    for (const name of Object.keys(vars).filter((n) =>
      /^--(font-size|space|radius|measure|leading-normal|font-sans|font-brand)/.test(n),
    ))
      expect([name, vars[name]]).toEqual([name, primitive(name)]);
  });

  it('derives every accent step from the picked colour, with fixed lightness and capped chroma', () => {
    expect(vars['--accent-600']).toBe('oklch(from #228be6 0.626 calc(min(c, 0.19) * 1) h)');
    expect(Object.keys(vars).filter((n) => n.startsWith('--accent-'))).toHaveLength(12);
  });

  it('tints the greys by hue and amount, and leaves the backdrop alone unless picked', () => {
    const tinted = themeVars({
      ...defaultTheme('dark', 't', 'x'),
      neutralHue: 30,
      neutralTint: 0.03,
    });
    expect(tinted['--gray-500']).toBe('oklch(0.769 0.03 30)');
    expect(tinted['--color-backdrop']).toBeUndefined();
    expect(
      themeVars({ ...defaultTheme('dark', 't', 'x'), backdrop: '#112233' })['--color-backdrop'],
    ).toBe('#112233');
  });

  it('scales type, spacing and radius; flat shadows at zero depth', () => {
    const t = themeVars({
      ...defaultTheme('light', 't', 'x'),
      textScale: 1.1,
      spaceScale: 1.2,
      radiusScale: 0,
      shadowScale: 0,
    });
    expect(t['--font-size-base']).toBe('calc(1rem * 1.1)');
    expect(t['--space-4']).toBe('1.2rem');
    expect(t['--radius-md']).toBe('0px');
    expect(t['--shadow-lg']).toBe('none');
  });

  it('uses the text face for the name when asked to', () => {
    const t = themeVars({
      ...defaultTheme('light', 't', 'x'),
      fontText: 'serif',
      fontName: 'text',
    });
    expect(t['--font-brand']).toBe(t['--font-sans']);
    expect(t['--font-sans']).toMatch(/^"IBM Plex Serif"/);
  });

  it('sets the reading face for body text: serif by default, the text face, or its own', () => {
    const base = defaultTheme('light', 't', 'x');
    expect(themeVars(base)['--font-prose']).toMatch(/^"IBM Plex Serif"/);
    const same = themeVars({ ...base, fontText: 'system', fontReading: 'text' });
    expect(same['--font-prose']).toBe(same['--font-sans']);
    expect(themeVars({ ...base, fontReading: 'mono' })['--font-prose']).toMatch(/^"IBM Plex Mono"/);
  });
});

describe('customTheme schema', () => {
  const valid = defaultTheme('light', 't', 'Mine');

  it('clamps out-of-range values instead of rejecting a stored theme', () => {
    const parsed = customTheme.parse({ ...valid, textScale: 3, neutralTint: -1, neutralHue: 370 });
    expect(parsed.textScale).toBe(RANGES.textScale.max);
    expect(parsed.neutralTint).toBe(RANGES.neutralTint.min);
    expect(parsed.neutralHue).toBe(10);
  });

  it('reads a theme saved before the reading font in serif', () => {
    const { fontReading: _, ...older } = valid;
    expect(customTheme.parse(older).fontReading).toBe('serif');
  });

  it.each([
    ['a non-hex accent', { accent: 'red' }],
    ['an unknown font', { fontText: 'comic-sans' }],
    ['an empty name', { name: '' }],
  ])('rejects %s', (_n, patch) => {
    expect(customTheme.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});
