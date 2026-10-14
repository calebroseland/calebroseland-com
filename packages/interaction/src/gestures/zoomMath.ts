/* The image viewer's geometry, as pure functions. A view is the image's offset from the stage's
   centre and its scale over the fitted size; every gesture decides through these. */

export type Size = { width: number; height: number };
export type Point = { x: number; y: number };
export type View = { x: number; y: number; scale: number };

// Taller than this many widths, an image fits to the width and is read by panning.
const TALL = 2.5;
const MIN_ZOOM = 2;
const MAX_ZOOM = 4;
const RUBBER = 1 / 3;
const SWIPE_SHARE = 0.25;
const FLING = 0.5;
const DISMISS_PX = 120;

/** The image's size at 1×: contained in the stage less a margin, never enlarged past natural unless `upscale`. */
export const fitSize = (
  natural: Size,
  stage: Size,
  opts: { margin: number; upscale: boolean },
): Size => {
  const width = stage.width - 2 * opts.margin;
  const height = stage.height - 2 * opts.margin;
  const byWidth = width / natural.width;
  let s =
    natural.height > TALL * natural.width ? byWidth : Math.min(byWidth, height / natural.height);
  if (!opts.upscale) {
    s = Math.min(s, 1);
  }
  return { width: natural.width * s, height: natural.height * s };
};

/** How far a zoom may go: a raster to its natural size, at least 2× and at most 4×; a vector 4×. */
export const maxScale = (natural: Size, fit: Size, vector: boolean): number => {
  if (vector) {
    return MAX_ZOOM;
  }
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, natural.width / fit.width));
};

/** Past a limit, a value moves at a third of the rate, so the edge is felt rather than hit. */
export const rubberBand = (value: number, min: number, max: number, rate = RUBBER): number => {
  if (value < min) {
    return min + (value - min) * rate;
  }
  if (value > max) {
    return max + (value - max) * rate;
  }
  return value;
};

/** The view at a new scale, keeping the image point under `at` (relative to the stage's centre) still. */
export const zoomAt = (view: View, scale: number, at: Point): View => {
  const k = scale / view.scale;
  return { x: at.x - (at.x - view.x) * k, y: at.y - (at.y - view.y) * k, scale };
};

/** How far the image may move from the centre along each axis at a scale. */
export const panLimits = (fit: Size, scale: number, stage: Size): Point => ({
  x: Math.max(0, (fit.width * scale - stage.width) / 2),
  y: Math.max(0, (fit.height * scale - stage.height) / 2),
});

const clamp = (v: number, limit: number) => Math.min(limit, Math.max(-limit, v)) || 0;

/** The view moved back inside its pan limits. */
export const clampView = (view: View, fit: Size, stage: Size): View => {
  const limit = panLimits(fit, view.scale, stage);
  return { x: clamp(view.x, limit.x), y: clamp(view.y, limit.y), scale: view.scale };
};

export type Step = 'next' | 'previous' | null;

/** Where a horizontal drag released at 1× goes: dragging left (negative) shows the next image. */
export const swipeStep = (dx: number, vx: number, width: number): Step => {
  const far = Math.abs(dx) > width * SWIPE_SHARE;
  const flung = Math.abs(vx) > FLING;
  if (flung && Math.sign(vx) !== Math.sign(dx)) {
    return null;
  }
  if (!(far || flung)) {
    return null;
  }
  return dx < 0 ? 'next' : 'previous';
};

/** Whether a vertical drag released at 1× closes the viewer. */
export const shouldDismiss = (dy: number, vy: number): boolean => {
  const flung = Math.abs(vy) > FLING;
  if (flung) {
    return Math.sign(vy) === Math.sign(dy);
  }
  return Math.abs(dy) > DISMISS_PX;
};
