import { durations, eases } from '@crc/ui';
import { useRouterState } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { animate } from 'motion/mini';
import { useCallback, useEffect, useRef, useState } from 'react';
import { canAnimate } from '../components/motion/presets.ts';
import { useReduceMotion } from '../hooks/useReduceMotion.ts';
import { loading } from './tracker.ts';

export type BarPhase = 'hidden' | 'waiting' | 'running' | 'finishing';

// A load shorter than this never shows the bar; once shown, it stays at least as long as SHOWN_MS.
const DELAY_MS = 300;
const SHOWN_MS = 400;
const FINISH_MS = (durations.fast + durations.normal) * 1000;

/** The loading bar's phase, from the count of pending loads; also marks `<body>` busy while it shows. */
export const useBarPhase = (): BarPhase => {
  const count = useStore(loading.store);
  const [phase, setPhase] = useState<BarPhase>('hidden');
  // The phase the timers act on; state only renders it.
  const current = useRef<BarPhase>('hidden');
  const shownAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const go = (next: BarPhase) => {
      current.current = next;
      setPhase(next);
    };
    const p = current.current;
    if (count > 0) {
      if (p === 'hidden') {
        go('waiting');
        timer.current = setTimeout(() => {
          shownAt.current = Date.now();
          go('running');
        }, DELAY_MS);
      } else if (p === 'finishing') {
        clearTimeout(timer.current);
        go('running');
      } else if (p === 'running') {
        // A finish already counting down is for a load that has been replaced by this one.
        clearTimeout(timer.current);
      }
      return;
    }
    if (p === 'waiting') {
      clearTimeout(timer.current);
      go('hidden');
    } else if (p === 'running') {
      const left = Math.max(0, SHOWN_MS - (Date.now() - shownAt.current));
      timer.current = setTimeout(() => {
        go('finishing');
        timer.current = setTimeout(() => go('hidden'), FINISH_MS);
      }, left);
    }
  }, [count]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const busy = phase === 'running' || phase === 'finishing';
  useEffect(() => {
    if (busy) {
      document.body.setAttribute('aria-busy', 'true');
      return () => document.body.removeAttribute('aria-busy');
    }
  }, [busy]);

  return phase;
};

/** The bar: its phase, and a ref that moves it — slides in and trickles while running, completes and
    fades when finishing; under reduced motion, a pulse and a fade. */
export const useLoadingBar = () => {
  const phase = useBarPhase();
  const reduce = useReduceMotion();
  const node = useRef<HTMLDivElement | null>(null);
  const running = useRef<Array<ReturnType<typeof animate>>>([]);
  const run = useCallback(
    (el: HTMLElement | null, p: BarPhase) => {
      if (!el || !canAnimate) {
        return;
      }
      // One phase's motion at a time: stop where it is (stop keeps that frame), then carry on from it.
      for (const a of running.current) {
        a.stop();
      }
      running.current = [];
      const play = (...args: Parameters<typeof animate>) => {
        const a = animate(...args);
        running.current.push(a);
        return a;
      };
      if (p === 'running') {
        el.style.opacity = '1';
        if (reduce) {
          play(
            el,
            { opacity: [0.4, 1] },
            { duration: 0.9, repeat: Infinity, repeatType: 'reverse' },
          );
          return;
        }
        const at = Number.parseFloat(getComputedStyle(el).scale) || 0;
        // From nothing: quick to a fifth, then ever slower toward nine tenths. Back from finishing:
        // on from where it got to. It never claims to be done.
        play(
          el,
          { scale: at > 0.2 ? [`${at} 1`, '0.9 1'] : ['0 1', '0.2 1', '0.9 1'] },
          at > 0.2
            ? { duration: 8, ease: [...eases.out] }
            : { duration: 12, times: [0, 0.03, 1], ease: [...eases.out] },
        );
        return;
      }
      if (p === 'finishing') {
        const fade = () => play(el, { opacity: 0 }, { duration: durations.normal });
        if (reduce) {
          fade();
          return;
        }
        const grow = play(el, { scale: '1 1' }, { duration: durations.fast });
        // Only if nothing has started since: a new load stops the grow, and must not then see a fade.
        void grow.then(() => running.current.includes(grow) && fade());
        return;
      }
      if (p === 'hidden') {
        el.style.removeProperty('scale');
      }
    },
    [reduce],
  );
  useEffect(() => run(node.current, phase), [run, phase]);
  return { ref: node, phase };
};

/** Counts a load while `active` is true: a state that is not one promise, such as a query's loading. */
export const useTrackLoading = (active: boolean): void => {
  useEffect(() => (active ? loading.begin() : undefined), [active]);
};

/** Every router navigation (pages, posts, editor routes, their chunks and loaders) feeds the bar. */
export const useRouterLoading = (): void => {
  const pending = useRouterState({ select: (s) => s.status === 'pending' });
  useTrackLoading(pending);
};
