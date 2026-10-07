import { describe, expect, it } from 'vitest';
import { contrastRatio, parseColor } from './contrast.ts';

describe('parseColor', () => {
  it.each([
    ['rgb(255, 255, 255)', [1, 1, 1]],
    ['rgba(0, 0, 0, 0.5)', [0, 0, 0]],
    ['color(srgb 1 0 0)', [1, 0, 0]],
  ])('%s', (css, rgb) => {
    expect(parseColor(css)).toEqual(rgb);
  });

  it('converts OKLCH, matching Open Color blue 6 (#228be6) to within a channel step', () => {
    const [r, g, b] = parseColor('oklch(0.626 0.164 250)') ?? [];
    expect([r, g, b].map((v) => Math.round((v ?? 0) * 255))).toEqual([
      expect.closeTo(0x22, -0.5),
      expect.closeTo(0x8b, -0.5),
      expect.closeTo(0xe6, -0.5),
    ]);
  });

  it('returns null for anything it cannot read', () => {
    expect(parseColor('var(--color-text)')).toBeNull();
    expect(parseColor('color(display-p3 1 0 0)')).toBeNull();
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white and symmetric', () => {
    expect(contrastRatio([0, 0, 0], [1, 1, 1])).toBeCloseTo(21, 5);
    expect(contrastRatio([1, 1, 1], [0, 0, 0])).toBeCloseTo(21, 5);
  });

  it("agrees with the built-in light theme's body text (gray 9 on gray 0, about 15:1)", () => {
    const fg = parseColor('oklch(0.262 0.009 248)');
    const bg = parseColor('oklch(0.982 0.002 248)');
    if (!fg || !bg) {
      throw new Error('parse');
    }
    expect(contrastRatio(fg, bg)).toBeGreaterThan(14);
    expect(contrastRatio(fg, bg)).toBeLessThan(16.5);
  });
});
