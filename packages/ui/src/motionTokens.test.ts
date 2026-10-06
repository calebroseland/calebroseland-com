import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { durations, eases } from './motionTokens.ts';

const css = readFileSync(new URL('./tokens/primitives.css', import.meta.url), 'utf8');
// Only the un-reduced block: take everything before the reduced-motion media query.
const base = css.slice(0, css.indexOf('@media (prefers-reduced-motion'));

describe('motion tokens mirror primitives.css', () => {
  it.each(Object.entries(durations))('--duration-%s', (name, seconds) => {
    const m = base.match(new RegExp(`--duration-${name}:\\s*(\\d+)ms`));
    expect(m, `--duration-${name} missing in CSS`).not.toBeNull();
    expect(Number(m?.[1]) / 1000).toBe(seconds);
  });

  it.each([
    ['out', eases.out],
    ['in-out', eases.inOut],
    ['in', eases.in],
  ])('--ease-%s', (name, curve) => {
    const m = base.match(new RegExp(`--ease-${name}:\\s*cubic-bezier\\(([^)]+)\\)`));
    expect(m, `--ease-${name} missing in CSS`).not.toBeNull();
    expect(m?.[1]?.split(',').map((n) => Number(n.trim()))).toEqual([...curve]);
  });
});
