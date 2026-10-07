import { describe, expect, it } from 'vitest';
import { DEFAULT_FONTS, fontVars, usesAdobeFonts } from './fonts.ts';
import { parseYaml } from './load.ts';
import { siteTheme } from './theme.ts';

describe('site theme', () => {
  it("keeps today's faces for anything content/theme.yaml leaves out", () => {
    expect(parseYaml(siteTheme, '{}').fonts).toEqual(DEFAULT_FONTS);
    expect(parseYaml(siteTheme, 'fonts: { text: system }').fonts).toEqual({
      ...DEFAULT_FONTS,
      text: 'system',
    });
  });

  it('rejects a face it does not know', () => {
    expect(() => parseYaml(siteTheme, 'fonts: { name: comic-sans }')).toThrow();
  });

  it('needs the Adobe kit only when a resolved face comes from it', () => {
    expect(usesAdobeFonts(DEFAULT_FONTS)).toBe(true);
    expect(usesAdobeFonts({ text: 'system', name: 'text', reading: 'serif' })).toBe(false);
    // "Same as text" follows the text face, into the kit and out of it.
    expect(usesAdobeFonts({ text: 'proxima', name: 'serif', reading: 'text' })).toBe(true);
  });

  it('puts the resolved faces in the font tokens', () => {
    const vars = fontVars({ text: 'system', name: 'text', reading: 'mono' });
    expect(vars['--font-brand']).toBe(vars['--font-sans']);
    expect(vars['--font-prose']).toMatch(/^"IBM Plex Mono"/);
  });
});
