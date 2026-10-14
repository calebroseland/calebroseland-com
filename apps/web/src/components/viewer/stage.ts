import {
  clampView,
  fitSize,
  type GestureHandlers,
  maxScale,
  type PanEvent,
  type PinchEvent,
  type Point,
  panLimits,
  rubberBand,
  type Size,
  shouldDismiss,
  swipeStep,
  type View,
  zoomAt,
} from '@crc/interaction/gestures';
import { durations } from '@crc/ui';
import { animate, inertia, type MotionValue, spring, type ValueAnimationTransition } from 'motion';

type AnimationOptions = ValueAnimationTransition<number>;

/* The viewer's stage: what each gesture does to the shown image, through Motion values the
   component renders. Geometry lives in @crc/interaction's zoomMath; this file only decides. */

export type StageValues = {
  /** The image's offset from the stage's centre and its scale over the fitted size. */
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  /** The row of images, moved by a swipe between them. */
  strip: MotionValue<number>;
  /** The scrim's opacity, faded by a dismissing drag or pinch. */
  backdrop: MotionValue<number>;
  /** Everything's opacity, for crossfades under reduced motion and closes that have nowhere to go. */
  fade: MotionValue<number>;
};

type StageItem = { natural: Size; vector: boolean };

export type StageEnv = {
  values: StageValues;
  /** The stage element's box in the viewport. */
  rect: () => DOMRect;
  item: () => StageItem;
  can: (step: 'next' | 'previous') => boolean;
  step: (step: 'next' | 'previous') => void;
  close: () => void;
  toggleControls: () => void;
  /** Any input, so controls hidden on a touch screen come back. */
  input: (pointerType: 'mouse' | 'touch' | 'pen') => void;
  settled: (scale: number) => void;
  reduce: () => boolean;
};

export const SLIDE_GAP = 24;
const MARGIN = 16;
const CLICK_ZOOM = 2.5;
const KEY_ZOOM = 1.5;
const PINCH_FLOOR = 0.4;
const PINCH_CLOSE = 0.85;
const DISMISS_FADE_PX = 480;
const WHEEL_STEP_PX = 60;
const WHEEL_COOLDOWN_MS = 450;
const ZOOMED = 1.01;

const settle: AnimationOptions = { type: spring, visualDuration: 0.35, bounce: 0.15 };
const fadeTiming: AnimationOptions = { duration: durations.normal };
// Rest thresholds in each value's own unit, so a settle reports promptly instead of creeping.
const settlePx: AnimationOptions = { ...settle, restDelta: 0.5, restSpeed: 5 };
const settleScale: AnimationOptions = { ...settle, restDelta: 0.002, restSpeed: 0.02 };

type Running = { stop: () => void };

export type Stage = {
  handlers: GestureHandlers;
  zoomTo: (scale: number, at?: Point) => void;
  zoomBy: (factor: number) => void;
  reset: () => void;
  zoomed: () => boolean;
  nudge: (dx: number, dy: number) => void;
  keyZoom: number;
  fit: () => Size;
  rest: () => void;
  open: (source: DOMRect | null) => void;
  close: (source: DOMRect | null) => Promise<void>;
  dispose: () => void;
};

export const createStage = (env: StageEnv): Stage => {
  const v = env.values;
  let running: Running[] = [];
  let mode: 'pan' | 'swipe' | 'dismiss' | null = null;
  let from: View = { x: 0, y: 0, scale: 1 };
  // The scale the image is at or heading to; a press mid-animation acts on where it is going.
  let aim = 1;
  let wheelX = 0;
  let wheelLock = 0;
  let wheelSettle: ReturnType<typeof setTimeout> | undefined;

  const size = (): Size => {
    const r = env.rect();
    return { width: r.width, height: r.height };
  };
  const fit = (): Size => {
    const it = env.item();
    return fitSize(it.natural, size(), { margin: MARGIN, upscale: it.vector });
  };
  const max = (): number => {
    const it = env.item();
    return maxScale(it.natural, fit(), it.vector);
  };
  const view = (): View => ({ x: v.x.get(), y: v.y.get(), scale: v.scale.get() });
  /** A client point, relative to the stage's centre. */
  const local = (p: Point): Point => {
    const r = env.rect();
    return { x: p.x - r.left - r.width / 2, y: p.y - r.top - r.height / 2 };
  };

  const stop = () => {
    for (const r of running) {
      r.stop();
    }
    running = [];
  };

  const run = (value: MotionValue<number>, to: number, options: AnimationOptions = settle) => {
    if (env.reduce()) {
      value.jump(to);
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      running.push(animate(value, to, { ...options, onComplete: resolve }));
    });
  };

  const done = () => env.settled(v.scale.get());

  /** Springs to a view kept inside its pan limits. */
  const go = (target: View) => {
    stop();
    const t = clampView(target, fit(), size());
    aim = t.scale;
    void Promise.all([
      run(v.x, t.x, settlePx),
      run(v.y, t.y, settlePx),
      run(v.scale, t.scale, settleScale),
    ]).then(done);
  };

  const zoomTo = (scale: number, at: Point = { x: 0, y: 0 }) => {
    go(zoomAt(view(), Math.min(max(), Math.max(1, scale)), at));
  };

  const toggleZoom = (at: Point) => {
    if (aim > ZOOMED) {
      go({ x: 0, y: 0, scale: 1 });
    } else {
      zoomTo(Math.min(CLICK_ZOOM, max()), at);
    }
  };

  const pans = () => {
    const lim = panLimits(fit(), v.scale.get(), size());
    return { x: lim.x > 0, y: lim.y > 0 };
  };

  const panStart = (e: PanEvent) => {
    stop();
    from = view();
    const can = pans();
    if (aim > ZOOMED || (e.axis === 'y' && can.y) || (e.axis === 'x' && can.x)) {
      mode = 'pan';
    } else if (e.pointerType === 'mouse') {
      mode = null;
    } else {
      mode = e.axis === 'x' ? 'swipe' : 'dismiss';
    }
  };

  const pan = (e: PanEvent) => {
    if (mode === 'pan') {
      const lim = panLimits(fit(), from.scale, size());
      v.x.set(rubberBand(from.x + e.dx, -lim.x, lim.x));
      v.y.set(rubberBand(from.y + e.dy, -lim.y, lim.y));
    } else if (mode === 'swipe') {
      const blocked = !env.can(e.dx < 0 ? 'next' : 'previous');
      v.strip.set(blocked ? rubberBand(e.dx, 0, 0) : e.dx);
    } else if (mode === 'dismiss') {
      v.y.set(e.dy);
      v.backdrop.set(Math.max(0, 1 - Math.abs(e.dy) / DISMISS_FADE_PX));
    }
  };

  const panEnd = (e: PanEvent & { vx: number; vy: number; interrupted: boolean }) => {
    const m = mode;
    mode = null;
    if (e.interrupted) {
      return;
    }
    if (m === 'pan') {
      const lim = panLimits(fit(), v.scale.get(), size());
      if (env.reduce()) {
        go(view());
        return;
      }
      // Flung, it keeps going and comes to rest inside the image's edges (px/ms → px/s).
      const glide = (value: MotionValue<number>, velocity: number, limit: number) =>
        animate(value, value.get(), {
          type: inertia,
          velocity: velocity * 1000,
          min: -limit,
          max: limit,
          power: 0.6,
          timeConstant: 300,
          bounceStiffness: 400,
          bounceDamping: 40,
        });
      running.push(glide(v.x, e.vx, lim.x), glide(v.y, e.vy, lim.y));
      return;
    }
    if (m === 'swipe') {
      const step = swipeStep(e.dx, e.vx, size().width);
      if (step && env.can(step)) {
        const to = (size().width + SLIDE_GAP) * (step === 'next' ? -1 : 1);
        void run(v.strip, to, { ...settle, velocity: e.vx * 1000 }).then(() => env.step(step));
      } else {
        void run(v.strip, 0);
      }
      return;
    }
    if (m === 'dismiss') {
      if (shouldDismiss(e.dy, e.vy)) {
        env.close();
      } else {
        void run(v.y, 0);
        void run(v.backdrop, 1, fadeTiming);
      }
    }
  };

  const pinchStart = () => {
    stop();
    mode = null;
    from = view();
  };

  const pinch = (e: PinchEvent) => {
    const scale = rubberBand(from.scale * e.scale, PINCH_FLOOR, max());
    const at = local({ x: e.x - e.dx, y: e.y - e.dy });
    const zoomed = zoomAt(from, scale, at);
    v.scale.set(scale);
    aim = scale;
    v.x.set(zoomed.x + e.dx);
    v.y.set(zoomed.y + e.dy);
    v.backdrop.set(scale < 1 ? Math.max(0, (scale - PINCH_FLOOR) / (1 - PINCH_FLOOR)) : 1);
  };

  const pinchEnd = (e: PinchEvent) => {
    const scale = v.scale.get();
    if (scale < PINCH_CLOSE) {
      env.close();
      return;
    }
    void run(v.backdrop, 1, fadeTiming);
    go(zoomAt(view(), Math.min(max(), Math.max(1, scale)), local(e)));
  };

  const onImage = (p: Point): boolean => {
    const f = fit();
    const s = v.scale.get();
    return (
      Math.abs(p.x - v.x.get()) <= (f.width * s) / 2
      && Math.abs(p.y - v.y.get()) <= (f.height * s) / 2
    );
  };

  const handlers: GestureHandlers = {
    input: env.input,
    // A click on the image zooms; on the scrim it closes. A touch tap only shows or hides the
    // controls: a wide diagram leaves most of a phone's screen as scrim.
    tap: (e) => {
      const p = local(e);
      if (e.pointerType !== 'mouse') {
        env.toggleControls();
      } else if (onImage(p)) {
        toggleZoom(p);
      } else {
        env.close();
      }
    },
    doubleTap: (e) => toggleZoom(local(e)),
    panStart,
    pan,
    panEnd,
    pinchStart,
    pinch,
    pinchEnd,
    zoom: (e) => {
      stop();
      const scale = Math.min(max(), Math.max(1, v.scale.get() * e.factor));
      const next = clampView(zoomAt(view(), scale, local(e)), fit(), size());
      v.x.set(next.x);
      v.y.set(next.y);
      v.scale.set(next.scale);
      aim = next.scale;
      clearTimeout(wheelSettle);
      wheelSettle = setTimeout(done, 150);
    },
    wheel: (e) => {
      if (aim > ZOOMED || pans().y) {
        stop();
        const next = clampView(
          { ...view(), x: v.x.get() - e.dx, y: v.y.get() - e.dy },
          fit(),
          size(),
        );
        v.x.set(next.x);
        v.y.set(next.y);
        return;
      }
      // A two-finger horizontal swipe on a trackpad moves between images, once per gesture.
      const now = performance.now();
      if (now < wheelLock || Math.abs(e.dx) < Math.abs(e.dy)) {
        return;
      }
      wheelX += e.dx;
      if (Math.abs(wheelX) > WHEEL_STEP_PX) {
        const step = wheelX > 0 ? 'next' : 'previous';
        wheelX = 0;
        wheelLock = now + WHEEL_COOLDOWN_MS;
        if (env.can(step)) {
          env.step(step);
        }
      }
    },
  };

  return {
    handlers,
    zoomTo,
    zoomBy: (factor: number) => zoomTo(aim * factor),
    reset: () => go({ x: 0, y: 0, scale: 1 }),
    zoomed: () => aim > ZOOMED,
    /** Pans a zoomed image by a share of the stage, for the arrow keys. */
    nudge: (dx: number, dy: number) => {
      const s = size();
      go({ ...view(), x: v.x.get() - dx * s.width * 0.1, y: v.y.get() - dy * s.height * 0.1 });
    },
    keyZoom: KEY_ZOOM,
    fit,
    /** Back to rest for a newly shown image: centred, 1×, the row of images in place. */
    rest: () => {
      stop();
      aim = 1;
      v.x.jump(0);
      v.y.jump(0);
      v.scale.jump(1);
      v.strip.jump(0);
      v.backdrop.jump(1);
    },
    /** Grows the image out of `source` (its box on the page), or fades in under reduced motion. */
    open: (source: DOMRect | null) => {
      stop();
      aim = 1;
      const r = env.rect();
      const f = fit();
      if (env.reduce() || !source || f.width === 0) {
        v.fade.jump(0);
        animate(v.fade, 1, fadeTiming);
        return;
      }
      v.backdrop.jump(0);
      v.scale.jump(source.width / f.width);
      v.x.jump(source.left + source.width / 2 - (r.left + r.width / 2));
      v.y.jump(source.top + source.height / 2 - (r.top + r.height / 2));
      running.push(
        animate(v.backdrop, 1, fadeTiming),
        animate(v.x, 0, settle),
        animate(v.y, 0, settle),
        animate(v.scale, 1, settle),
      );
    },
    /** Shrinks back into `source` when it is on screen, else fades; resolves when finished. */
    close: (source: DOMRect | null): Promise<void> => {
      stop();
      const r = env.rect();
      const f = fit();
      const onScreen =
        source
        && source.bottom > 0
        && source.top < window.innerHeight
        && source.width > 0
        && f.width > 0;
      if (env.reduce() || !onScreen) {
        return Promise.resolve(animate(v.fade, 0, fadeTiming)).then(() => undefined);
      }
      const x = source.left + source.width / 2 - (r.left + r.width / 2);
      const y = source.top + source.height / 2 - (r.top + r.height / 2);
      // No overshoot: a bounce past the page's image would show it twice.
      return Promise.all([
        run(v.backdrop, 0, fadeTiming),
        run(v.x, x, { ...settlePx, bounce: 0 }),
        run(v.y, y, { ...settlePx, bounce: 0 }),
        run(v.scale, source.width / f.width, { ...settleScale, bounce: 0 }),
      ]).then(() => undefined);
    },
    dispose: () => {
      stop();
      clearTimeout(wheelSettle);
    },
  };
};
