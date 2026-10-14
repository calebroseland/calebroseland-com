import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type GestureHandlers, recognize } from './recognizer.ts';

let el: HTMLElement;
let stop: () => void;
let now = 0;

const fire = (
  type: string,
  id: number,
  x: number,
  y: number,
  pointerType: 'mouse' | 'touch' = 'touch',
) => {
  const e = new PointerEvent(type, {
    pointerId: id,
    clientX: x,
    clientY: y,
    pointerType,
    button: 0,
  });
  Object.defineProperty(e, 'timeStamp', { value: now });
  el.dispatchEvent(e);
};

/** One finger from a point through steps, 16 ms apart. */
const drag = (
  id: number,
  points: Array<[number, number]>,
  pointerType: 'mouse' | 'touch' = 'touch',
) => {
  const [start, ...rest] = points;
  if (!start) {
    return;
  }
  fire('pointerdown', id, ...start, pointerType);
  for (const p of rest) {
    now += 16;
    fire('pointermove', id, ...p, pointerType);
  }
  fire('pointerup', id, ...(rest.at(-1) ?? start), pointerType);
};

const listen = (opts = {}) => {
  const calls: Array<[string, unknown]> = [];
  const handlers = new Proxy({} as GestureHandlers, {
    get: (_, name: string) => (e: unknown) => calls.push([name, e]),
  });
  stop = recognize(el, handlers, opts);
  return calls;
};

const names = (calls: Array<[string, unknown]>) =>
  calls.map(([n]) => n).filter((n) => n !== 'input');

beforeEach(() => {
  vi.useFakeTimers();
  now = 1000;
  el = document.createElement('div');
  document.body.append(el);
  Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
});

afterEach(() => {
  stop();
  el.remove();
  vi.useRealTimers();
});

describe('recognize', () => {
  it('reports a mouse click as a tap at once', () => {
    const calls = listen();
    drag(1, [[100, 100]], 'mouse');
    expect(calls.find(([n]) => n === 'tap')?.[1]).toEqual({ x: 100, y: 100, pointerType: 'mouse' });
  });

  it('waits to tell a touch tap from a double tap', () => {
    const calls = listen();
    drag(1, [[100, 100]]);
    expect(names(calls)).toEqual([]);
    vi.advanceTimersByTime(300);
    expect(names(calls)).toEqual(['tap']);

    calls.length = 0;
    drag(1, [[200, 200]]);
    now += 120;
    drag(1, [[204, 202]]);
    vi.advanceTimersByTime(400);
    expect(names(calls)).toEqual(['doubleTap']);
  });

  it('pans past a 10 px slop, locks the axis, and reports velocity at release', () => {
    const calls = listen();
    drag(1, [
      [100, 100],
      [104, 101],
      [130, 104],
      [180, 108],
      [260, 110],
    ]);
    expect(names(calls)).toEqual(['panStart', 'pan', 'pan', 'pan', 'panEnd']);
    const end = calls.at(-1)?.[1] as { dx: number; axis: string; vx: number; interrupted: boolean };
    expect(end.dx).toBe(160);
    expect(end.axis).toBe('x');
    expect(end.vx).toBeGreaterThan(3);
    expect(end.interrupted).toBe(false);
  });

  it('turns two fingers into a pinch around their midpoint, ending any pan', () => {
    const calls = listen();
    fire('pointerdown', 1, 400, 400);
    now += 16;
    fire('pointermove', 1, 420, 400);
    fire('pointerdown', 2, 600, 400);
    now += 16;
    fire('pointermove', 2, 700, 400);
    fire('pointerup', 2, 700, 400);
    expect(names(calls)).toEqual(['panStart', 'pan', 'panEnd', 'pinchStart', 'pinch', 'pinchEnd']);
    expect(calls.find(([n]) => n === 'panEnd')?.[1]).toMatchObject({ interrupted: true });
    const pinch = calls.find(([n]) => n === 'pinch')?.[1] as { scale: number; x: number };
    expect(pinch.scale).toBeCloseTo(280 / 180);
    expect(pinch.x).toBe(560);
  });

  it('leaves touches at the side edges to the system', () => {
    const calls = listen({ edge: 24 });
    drag(1, [
      [10, 300],
      [200, 300],
    ]);
    drag(2, [
      [990, 300],
      [700, 300],
    ]);
    expect(names(calls)).toEqual([]);
  });

  it('zooms on Ctrl + wheel and pans on a plain wheel, never scrolling the page', () => {
    const calls = listen();
    const zoom = new WheelEvent('wheel', {
      deltaY: -50,
      ctrlKey: true,
      clientX: 10,
      clientY: 20,
      cancelable: true,
    });
    el.dispatchEvent(zoom);
    const scroll = new WheelEvent('wheel', { deltaX: 30, deltaY: 5, cancelable: true });
    el.dispatchEvent(scroll);
    expect(zoom.defaultPrevented && scroll.defaultPrevented).toBe(true);
    expect(calls.find(([n]) => n === 'zoom')?.[1]).toEqual({ x: 10, y: 20, factor: Math.exp(0.5) });
    expect(calls.find(([n]) => n === 'wheel')?.[1]).toEqual({ dx: 30, dy: 5 });
  });

  it('stops listening', () => {
    const calls = listen();
    stop();
    drag(1, [[100, 100]], 'mouse');
    expect(calls).toEqual([]);
    stop = () => undefined;
  });
});
