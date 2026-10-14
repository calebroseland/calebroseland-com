import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  clampView,
  fitSize,
  maxScale,
  panLimits,
  rubberBand,
  shouldDismiss,
  swipeStep,
  zoomAt,
} from './zoomMath.ts';

const stage = { width: 1000, height: 800 };
const size = fc.record({
  width: fc.integer({ min: 50, max: 4000 }),
  height: fc.integer({ min: 50, max: 4000 }),
});
const point = fc.record({
  x: fc.double({ min: -500, max: 500, noNaN: true }),
  y: fc.double({ min: -400, max: 400, noNaN: true }),
});
const view = fc.record({
  x: fc.double({ min: -2000, max: 2000, noNaN: true }),
  y: fc.double({ min: -2000, max: 2000, noNaN: true }),
  scale: fc.double({ min: 1, max: 4, noNaN: true }),
});

describe('fitSize', () => {
  it('contains the image within the stage less its margin', () => {
    expect(fitSize({ width: 2000, height: 1000 }, stage, { margin: 16, upscale: false })).toEqual({
      width: 968,
      height: 484,
    });
    expect(fitSize({ width: 1000, height: 2000 }, stage, { margin: 0, upscale: false })).toEqual({
      width: 400,
      height: 800,
    });
  });

  it('never enlarges a raster image past its natural size, but does enlarge a vector', () => {
    expect(fitSize({ width: 200, height: 100 }, stage, { margin: 0, upscale: false })).toEqual({
      width: 200,
      height: 100,
    });
    expect(fitSize({ width: 200, height: 100 }, stage, { margin: 0, upscale: true })).toEqual({
      width: 1000,
      height: 500,
    });
  });

  it('fits a very tall image to the width instead, so it can be read and panned', () => {
    const fit = fitSize({ width: 390, height: 3600 }, stage, { margin: 0, upscale: true });
    expect(fit.width).toBeCloseTo(1000, 9);
    expect(fit.height).toBeCloseTo((3600 / 390) * 1000, 9);
  });
});

describe('maxScale', () => {
  it('lets a raster zoom to its natural size, at least 2× and at most 4× the fit', () => {
    expect(maxScale({ width: 1000, height: 500 }, { width: 1000, height: 500 }, false)).toBe(2);
    expect(maxScale({ width: 3000, height: 1500 }, { width: 1000, height: 500 }, false)).toBe(3);
    expect(maxScale({ width: 9000, height: 4500 }, { width: 1000, height: 500 }, false)).toBe(4);
    expect(maxScale({ width: 100, height: 50 }, { width: 1000, height: 500 }, true)).toBe(4);
  });
});

describe('rubberBand', () => {
  it('is the value itself inside the limits, and a third of the excess past them', () => {
    expect(rubberBand(5, 0, 10)).toBe(5);
    expect(rubberBand(13, 0, 10)).toBe(11);
    expect(rubberBand(-6, 0, 10)).toBe(-2);
  });
});

describe('zoomAt', () => {
  it('keeps the point under the cursor still', () => {
    const next = zoomAt({ x: 0, y: 0, scale: 1 }, 2, { x: 100, y: 50 });
    expect(next).toEqual({ x: -100, y: -50, scale: 2 });
  });

  it('zooming in and back out around the same point returns to the start', () => {
    fc.assert(
      fc.property(view, point, fc.double({ min: 1, max: 4, noNaN: true }), (v, p, s) => {
        const back = zoomAt(zoomAt(v, s, p), v.scale, p);
        expect(back.x).toBeCloseTo(v.x, 6);
        expect(back.y).toBeCloseTo(v.y, 6);
        expect(back.scale).toBeCloseTo(v.scale, 9);
      }),
    );
  });
});

describe('panning bounds', () => {
  it('allows no pan along an axis where the image is smaller than the stage', () => {
    expect(panLimits({ width: 500, height: 400 }, 1, stage)).toEqual({ x: 0, y: 0 });
    expect(panLimits({ width: 500, height: 400 }, 4, stage)).toEqual({ x: 500, y: 400 });
  });

  it('keeps the stage covered wherever the image is larger than it, and centred where not', () => {
    fc.assert(
      fc.property(size, view, (natural, v) => {
        const fit = fitSize(natural, stage, { margin: 16, upscale: false });
        const c = clampView(v, fit, stage);
        const w = fit.width * c.scale;
        const h = fit.height * c.scale;
        if (w >= stage.width) {
          expect(c.x - w / 2).toBeLessThanOrEqual(-stage.width / 2 + 1e-6);
          expect(c.x + w / 2).toBeGreaterThanOrEqual(stage.width / 2 - 1e-6);
        } else {
          expect(c.x).toBe(0);
        }
        if (h >= stage.height) {
          expect(c.y - h / 2).toBeLessThanOrEqual(-stage.height / 2 + 1e-6);
          expect(c.y + h / 2).toBeGreaterThanOrEqual(stage.height / 2 - 1e-6);
        } else {
          expect(c.y).toBe(0);
        }
      }),
    );
  });
});

describe('release decisions', () => {
  it('moves to the next or previous image past a quarter of the width, or on a fling', () => {
    expect(swipeStep(-300, 0, 1000)).toBe('next');
    expect(swipeStep(300, 0, 1000)).toBe('previous');
    expect(swipeStep(-100, -0.8, 1000)).toBe('next');
    expect(swipeStep(-100, 0, 1000)).toBeNull();
  });

  it('stays put when a long drag is flung back the other way', () => {
    expect(swipeStep(-300, 0.8, 1000)).toBeNull();
  });

  it('closes past 120 px or on a fling, either way, unless flung back', () => {
    expect(shouldDismiss(130, 0)).toBe(true);
    expect(shouldDismiss(-130, 0)).toBe(true);
    expect(shouldDismiss(40, 0.9)).toBe(true);
    expect(shouldDismiss(40, 0)).toBe(false);
    expect(shouldDismiss(130, -0.9)).toBe(false);
  });
});
