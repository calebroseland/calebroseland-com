import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { MAX_EDGE, targetSize } from './resize.ts';

describe('targetSize', () => {
  it('never exceeds the max edge and keeps the aspect ratio within integer rounding', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12000 }),
        fc.integer({ min: 1, max: 12000 }),
        (w, h) => {
          const out = targetSize(w, h);
          expect(Math.max(out.width, out.height)).toBeLessThanOrEqual(MAX_EDGE);
          expect(out.width).toBeGreaterThanOrEqual(1);
          expect(out.height).toBeGreaterThanOrEqual(1);
          if (Math.max(w, h) <= MAX_EDGE) {
            expect(out).toEqual({ width: w, height: h });
            return;
          }
          // Rounding moves the ratio by about 1/min(dimension). A side clamped up to 1px (extreme
          // ratios) legitimately breaks the ratio, so only assert when both sides are real.
          const smallest = Math.min(out.width, out.height);
          if (smallest > 2) {
            expect(Math.abs(out.width / out.height / (w / h) - 1)).toBeLessThanOrEqual(
              1 / smallest + 1e-9,
            );
          }
        },
      ),
    );
  });

  it('scales a 4000×3000 photo to 1600×1200', () => {
    expect(targetSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
  });
});
