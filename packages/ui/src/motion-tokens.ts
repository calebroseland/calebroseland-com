/* Mirrors --duration-* and --ease-* in tokens/primitives.css. motion-tokens.test.ts asserts parity. Seconds, not ms. */
export const durations = {
  instant: 0.05,
  fast: 0.12,
  normal: 0.2,
  slow: 0.32,
  slower: 0.5,
} as const;

export const eases = {
  out: [0.16, 1, 0.3, 1],
  inOut: [0.65, 0, 0.35, 1],
  in: [0.55, 0, 1, 0.45],
} as const;
