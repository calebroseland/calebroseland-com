/* Pointer Events in, gestures out: tap, double tap, pan with velocity, two-finger pinch, and wheel
   or trackpad zoom. It only reports; what a gesture does is the caller's business. */

export type PointerKind = 'mouse' | 'touch' | 'pen';
type Axis = 'x' | 'y';

export type TapEvent = { x: number; y: number; pointerType: PointerKind };
export type PanEvent = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  axis: Axis;
  pointerType: PointerKind;
};
export type PanEndEvent = PanEvent & { vx: number; vy: number; interrupted: boolean };
export type PinchEvent = { x: number; y: number; scale: number; dx: number; dy: number };
export type ZoomEvent = { x: number; y: number; factor: number };
type WheelPanEvent = { dx: number; dy: number };

export type GestureHandlers = {
  tap?: (e: TapEvent) => void;
  doubleTap?: (e: TapEvent) => void;
  panStart?: (e: PanEvent) => void;
  pan?: (e: PanEvent) => void;
  panEnd?: (e: PanEndEvent) => void;
  pinchStart?: (e: PinchEvent) => void;
  pinch?: (e: PinchEvent) => void;
  pinchEnd?: (e: PinchEvent) => void;
  /** Ctrl/⌘ + wheel, a trackpad pinch (sent as Ctrl + wheel, or WebKit's gesture events). */
  zoom?: (e: ZoomEvent) => void;
  /** A wheel or two-finger trackpad scroll. */
  wheel?: (e: WheelPanEvent) => void;
  /** Any input at all, for showing controls. */
  input?: (pointerType: PointerKind) => void;
};

export type RecognizerOptions = {
  /** Touches that start this close to the screen's side edges belong to the system's back swipe. */
  edge?: number;
};

const SLOP = 10;
const TAP_MS = 500;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 30;
const VELOCITY_WINDOW_MS = 100;
const WHEEL_ZOOM_RATE = 0.01;

type Track = { id: number; x: number; y: number; startX: number; startY: number; t0: number };
type Sample = { t: number; x: number; y: number };

const kind = (e: PointerEvent): PointerKind =>
  e.pointerType === 'touch' || e.pointerType === 'pen' ? e.pointerType : 'mouse';

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

/** Starts recognizing on `el`; returns a function that stops. */
export const recognize = (
  el: HTMLElement,
  on: GestureHandlers,
  opts: RecognizerOptions = {},
): (() => void) => {
  const edge = opts.edge ?? 0;
  const tracks = new Map<number, Track>();
  let pointerType: PointerKind = 'mouse';
  let panning: { axis: Axis; samples: Sample[] } | null = null;
  let pinching: { d0: number; m0: { x: number; y: number }; last: PinchEvent } | null = null;
  let lastTap: { t: number; x: number; y: number } | null = null;
  let tapTimer: ReturnType<typeof setTimeout> | undefined;

  const first = () => [...tracks.values()][0];
  const pair = () => {
    const [a, b] = [...tracks.values()];
    return a && b ? ([a, b] as const) : null;
  };

  const panEvent = (t: Track): PanEvent => ({
    x: t.x,
    y: t.y,
    dx: t.x - t.startX,
    dy: t.y - t.startY,
    axis: panning?.axis ?? 'x',
    pointerType,
  });

  const velocity = (samples: Sample[]) => {
    const last = samples.at(-1);
    const from = samples.find((s) => last && last.t - s.t <= VELOCITY_WINDOW_MS);
    if (!last || !from || last.t === from.t) {
      return { vx: 0, vy: 0 };
    }
    return { vx: (last.x - from.x) / (last.t - from.t), vy: (last.y - from.y) / (last.t - from.t) };
  };

  const endPan = (t: Track, interrupted: boolean) => {
    if (!panning) {
      return;
    }
    const v = interrupted ? { vx: 0, vy: 0 } : velocity(panning.samples);
    on.panEnd?.({ ...panEvent(t), ...v, interrupted });
    panning = null;
  };

  const pinchEvent = (a: Track, b: Track, d0: number, m0: { x: number; y: number }): PinchEvent => {
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    return { x: m.x, y: m.y, scale: distance(a, b) / d0, dx: m.x - m0.x, dy: m.y - m0.y };
  };

  const startPinch = () => {
    const p = pair();
    if (!p) {
      return;
    }
    const lead = first();
    if (lead) {
      endPan(lead, true);
    }
    const [a, b] = p;
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    pinching = { d0: Math.max(1, distance(a, b)), m0: m, last: { ...m, scale: 1, dx: 0, dy: 0 } };
    on.pinchStart?.(pinching.last);
  };

  const tap = (t: Track, at: number) => {
    const e: TapEvent = { x: t.x, y: t.y, pointerType };
    // A mouse click acts at once; a touch waits to see whether a second tap follows.
    if (pointerType === 'mouse') {
      on.tap?.(e);
      return;
    }
    if (lastTap && at - lastTap.t <= DOUBLE_TAP_MS && distance(lastTap, t) <= DOUBLE_TAP_PX) {
      clearTimeout(tapTimer);
      lastTap = null;
      on.doubleTap?.(e);
      return;
    }
    lastTap = { t: at, x: t.x, y: t.y };
    tapTimer = setTimeout(() => {
      lastTap = null;
      on.tap?.(e);
    }, DOUBLE_TAP_MS);
  };

  const down = (e: PointerEvent) => {
    pointerType = kind(e);
    on.input?.(pointerType);
    if (e.button !== 0 || tracks.size >= 2) {
      return;
    }
    if (pointerType === 'touch' && (e.clientX < edge || e.clientX > window.innerWidth - edge)) {
      return;
    }
    el.setPointerCapture?.(e.pointerId);
    tracks.set(e.pointerId, {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      t0: e.timeStamp,
    });
    if (tracks.size === 2) {
      startPinch();
    }
  };

  const move = (e: PointerEvent) => {
    const t = tracks.get(e.pointerId);
    if (!t) {
      return;
    }
    t.x = e.clientX;
    t.y = e.clientY;
    const p = pair();
    if (p && pinching) {
      pinching.last = pinchEvent(p[0], p[1], pinching.d0, pinching.m0);
      on.pinch?.(pinching.last);
      return;
    }
    const dx = t.x - t.startX;
    const dy = t.y - t.startY;
    if (!panning) {
      if (Math.hypot(dx, dy) < SLOP) {
        return;
      }
      panning = { axis: Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y', samples: [] };
      on.panStart?.(panEvent(t));
    }
    panning.samples.push({ t: e.timeStamp, x: t.x, y: t.y });
    panning.samples = panning.samples.filter((s) => e.timeStamp - s.t <= VELOCITY_WINDOW_MS * 2);
    on.pan?.(panEvent(t));
  };

  const up = (e: PointerEvent) => {
    const t = tracks.get(e.pointerId);
    if (!t) {
      return;
    }
    tracks.delete(e.pointerId);
    if (pinching) {
      on.pinchEnd?.(pinching.last);
      pinching = null;
      // The finger still down carries on as a new pan from where it is.
      const rest = first();
      if (rest) {
        rest.startX = rest.x;
        rest.startY = rest.y;
      }
      return;
    }
    if (panning) {
      endPan(t, e.type === 'pointercancel');
      return;
    }
    if (e.type === 'pointerup' && e.timeStamp - t.t0 <= TAP_MS) {
      tap(t, e.timeStamp);
    }
  };

  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    on.input?.('mouse');
    if (e.ctrlKey || e.metaKey) {
      on.zoom?.({ x: e.clientX, y: e.clientY, factor: Math.exp(-e.deltaY * WHEEL_ZOOM_RATE) });
    } else {
      on.wheel?.({ dx: e.deltaX, dy: e.deltaY });
    }
  };

  // Desktop Safari reports a trackpad pinch only through its own gesture events.
  let gestureScale = 1;
  const gestureStart = (e: Event) => {
    e.preventDefault();
    gestureScale = 1;
  };
  const gestureChange = (e: Event) => {
    e.preventDefault();
    const g = e as Event & { scale?: number; clientX?: number; clientY?: number };
    const scale = g.scale ?? 1;
    on.zoom?.({ x: g.clientX ?? 0, y: g.clientY ?? 0, factor: scale / gestureScale });
    gestureScale = scale;
  };

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', wheel, { passive: false });
  el.addEventListener('gesturestart', gestureStart);
  el.addEventListener('gesturechange', gestureChange);
  return () => {
    clearTimeout(tapTimer);
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
    el.removeEventListener('wheel', wheel);
    el.removeEventListener('gesturestart', gestureStart);
    el.removeEventListener('gesturechange', gestureChange);
  };
};
