import { eases } from '@crc/ui';
import { animate } from 'motion/mini';
import { canAnimate } from './presets.ts';

/* A body's blocks fade up into place as they scroll into view, once each. Blocks on screen when
   the page arrives are never hidden, and the hiding is applied here, never by default CSS, so a
   page without this script shows everything. */

type Animation = ReturnType<typeof animate>;

// Tuned with the owner: a settle, not an entrance. Small rise, short fade, a barely-there cascade.
const RISE = '0 6px';
const DURATION = 0.32;
const STEP = 0.03;
// Past four deep, a cascade reads as lag rather than arrival.
const DEEPEST = 3;
// A block starts as it reaches the screen's edge, so it is never seen waiting.
const MARGIN = '0px';

const reduceMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const active = new Set<(el: Element) => void>();

/** Shows the block holding `el` at once, and every hidden block above it: for the image viewer, which
    opens from and closes into a block that must be visible and still. */
export const revealNow = (el: Element): void => {
  for (const show of active) {
    show(el);
  }
};

/** Starts revealing `root`'s blocks; returns a function that stops and shows everything. */
export const revealBlocks = (root: HTMLElement): (() => void) => {
  if (!canAnimate || reduceMotion()) {
    return () => undefined;
  }
  const blocks = [...root.children] as HTMLElement[];
  const waiting = new Set<HTMLElement>();
  const seen = new WeakSet<Element>();
  const running: Animation[] = [];
  let entering: HTMLElement[] = [];
  let pending = 0;

  const unhide = (b: HTMLElement) => {
    b.removeAttribute('data-reveal');
    waiting.delete(b);
    observer.unobserve(b);
  };

  /** Every hidden block up to (not including) `index` shows at once: a jump skips their entry. */
  const showAbove = (index: number) => {
    for (const b of blocks.slice(0, index)) {
      if (waiting.has(b)) {
        unhide(b);
      }
    }
  };

  const flush = () => {
    pending = 0;
    const batch = entering
      .filter((b) => waiting.has(b))
      .sort((a, b) => blocks.indexOf(a) - blocks.indexOf(b));
    entering = [];
    const last = batch.at(-1);
    if (!last) {
      return;
    }
    showAbove(blocks.indexOf(last));
    batch.forEach((b, i) => {
      unhide(b);
      const run = animate(
        b,
        { opacity: [0, 1], translate: [RISE, '0 0'] },
        { duration: DURATION, ease: [...eases.out], delay: Math.min(i, DEEPEST) * STEP },
      );
      running.push(run);
      // Settled, the block is the stylesheet's again.
      void run.then(() => {
        b.style.removeProperty('opacity');
        b.style.removeProperty('translate');
      });
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const b = e.target as HTMLElement;
        if (!seen.has(b)) {
          // Where it starts: below the screen it waits; anywhere else it is simply shown.
          seen.add(b);
          if (!e.isIntersecting && (e.boundingClientRect?.top ?? 0) >= innerHeight) {
            b.dataset.reveal = 'waiting';
            waiting.add(b);
          } else {
            observer.unobserve(b);
          }
        } else if (e.isIntersecting && waiting.has(b)) {
          entering.push(b);
        }
      }
      if (entering.length > 0 && !pending) {
        pending = requestAnimationFrame(flush);
      }
    },
    { rootMargin: MARGIN },
  );

  const show = (el: Element) => {
    const index = blocks.findIndex((b) => b.contains(el));
    if (index >= 0) {
      showAbove(index + 1);
    }
  };
  // Keyboard users never land on a link they cannot see.
  const onFocus = (e: FocusEvent) => {
    if (e.target instanceof Element) {
      show(e.target);
    }
  };

  for (const b of blocks) {
    observer.observe(b);
  }
  root.addEventListener('focusin', onFocus);
  active.add(show);

  return () => {
    active.delete(show);
    observer.disconnect();
    cancelAnimationFrame(pending);
    root.removeEventListener('focusin', onFocus);
    for (const b of waiting) {
      b.removeAttribute('data-reveal');
    }
    waiting.clear();
    for (const run of running) {
      run.cancel();
    }
  };
};
