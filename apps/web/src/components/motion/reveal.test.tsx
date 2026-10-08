import { animate } from 'motion/mini';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revealBlocks, revealNow } from './reveal.ts';

// jsdom has no Web Animations; the real check is covered by E2E.
vi.mock('./presets.ts', () => ({ canAnimate: true }));
vi.mock('motion/mini', () => ({
  animate: vi.fn(() => Object.assign(Promise.resolve(), { cancel: vi.fn() })),
}));

type Callback = (entries: Array<Partial<IntersectionObserverEntry>>) => void;
let fire: Callback;
const observed = new Set<Element>();
const disconnect = vi.fn();

// A viewport 800 px tall; each block is 100 px, so blocks 0–7 start in view.
const VIEWPORT = 800;
const entry = (target: Element, top: number, isIntersecting: boolean) => ({
  target,
  isIntersecting,
  boundingClientRect: { top } as DOMRectReadOnly,
});

let root: HTMLElement;
let blocks: HTMLElement[];
let stop: () => void;

const setup = (count = 20) => {
  root = document.createElement('div');
  root.className = 'prose';
  blocks = Array.from({ length: count }, (_, i) => {
    const p = document.createElement('p');
    p.textContent = `Block ${i}`;
    return p;
  });
  root.append(...blocks);
  document.body.append(root);
  stop = revealBlocks(root);
  // The first notification reports every block where it starts.
  fire(blocks.map((b, i) => entry(b, i * 100, i * 100 < VIEWPORT)));
};

const waiting = () =>
  blocks.filter((b) => b.dataset.reveal === 'waiting').map((b) => blocks.indexOf(b));
const frame = () => vi.advanceTimersToNextFrame();

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(animate).mockClear();
  observed.clear();
  Object.defineProperty(window, 'innerHeight', { value: VIEWPORT, configurable: true });
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: Callback) {
        fire = cb;
      }
      observe(el: Element) {
        observed.add(el);
      }
      unobserve(el: Element) {
        observed.delete(el);
      }
      disconnect = disconnect;
    },
  );
});

afterEach(() => {
  stop();
  root.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('revealBlocks', () => {
  it('hides only the blocks that start below the viewport', () => {
    setup();
    expect(waiting()).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  });

  it('fades a block up as it enters, once, and gives it back to the stylesheet', () => {
    setup();
    fire([entry(blocks[8] as HTMLElement, 700, true)]);
    frame();
    expect(animate).toHaveBeenCalledOnce();
    expect(vi.mocked(animate).mock.calls[0]?.[0]).toBe(blocks[8]);
    expect(vi.mocked(animate).mock.calls[0]?.[2]).toMatchObject({ delay: 0 });
    expect(blocks[8]?.dataset.reveal).toBeUndefined();
    fire([entry(blocks[8] as HTMLElement, 700, true)]);
    frame();
    expect(animate).toHaveBeenCalledOnce();
  });

  it('cascades blocks entering together, at most five deep', () => {
    setup();
    fire(blocks.slice(8, 14).map((b, i) => entry(b, 700 + i * 20, true)));
    frame();
    const delays = vi.mocked(animate).mock.calls.map((c) => (c[2] as { delay: number }).delay);
    expect(delays).toEqual([0, 0.06, 0.12, 0.18, 0.24, 0.24]);
  });

  it('shows every hidden block above one that reveals, at once, after a jump', () => {
    setup();
    fire([entry(blocks[17] as HTMLElement, 300, true)]);
    frame();
    expect(waiting()).toEqual([18, 19]);
    expect(animate).toHaveBeenCalledOnce();
    expect(vi.mocked(animate).mock.calls[0]?.[0]).toBe(blocks[17]);
  });

  it('shows a hidden block, and those above it, when focus lands inside it', () => {
    setup();
    const link = document.createElement('a');
    link.href = '#';
    blocks[12]?.append(link);
    link.focus();
    expect(waiting()).toEqual([13, 14, 15, 16, 17, 18, 19]);
    expect(animate).not.toHaveBeenCalled();
  });

  it('shows a block on request, for the image viewer to open from or close into', () => {
    setup();
    const img = document.createElement('img');
    blocks[15]?.append(img);
    revealNow(img);
    expect(waiting()).toEqual([16, 17, 18, 19]);
  });

  it('cleans up everything it added', () => {
    setup();
    stop();
    expect(disconnect).toHaveBeenCalled();
    expect(waiting()).toEqual([]);
    stop = () => undefined;
  });

  it('does nothing when the visitor asked for reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    root = document.createElement('div');
    blocks = [document.createElement('p')];
    root.append(...blocks);
    stop = revealBlocks(root);
    expect(observed.size).toBe(0);
    expect(waiting()).toEqual([]);
  });
});
