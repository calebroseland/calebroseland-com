import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/* public/_redirects is read by Cloudflare, not by any code here, and the dev server ignores it; these
   rules catch a line Cloudflare would silently drop or a redirect that would loop or chain. */
const rules = readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line !== '' && !line.startsWith('#'))
  .map((line) => line.split(/\s+/));

describe('_redirects', () => {
  it('declares each rule as an absolute source, a destination and a permanent status', () => {
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(rule).toHaveLength(3);
      const [from, to, status] = rule;
      expect(from).toMatch(/^\//);
      expect(to).toMatch(/^(\/|https:\/\/)/);
      expect(['301', '308']).toContain(status);
    }
  });

  it('never repeats a source, and never points at another source', () => {
    const sources = rules.map(([from]) => from);
    expect(new Set(sources).size).toBe(sources.length);
    for (const [from, to] of rules) {
      expect(to).not.toBe(from);
      expect(sources).not.toContain(to);
    }
  });

  it('sends the old card page to the landing page, with or without a trailing slash', () => {
    expect(rules).toContainEqual(['/card', '/', '301']);
    expect(rules).toContainEqual(['/card/', '/', '301']);
  });
});
