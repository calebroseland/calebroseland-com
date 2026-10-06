import { useCallback, useLayoutEffect, useRef } from 'react';
import {
  canAnimate,
  enterPopup,
  leavePopup,
  type PopupKind,
  resetPopup,
} from '../components/motion/presets.ts';
import { useReduceMotion } from './useReduceMotion.ts';

type Running = ReturnType<typeof enterPopup>;
type Start = (el: HTMLElement, kind: PopupKind) => Running;

// Kept-mounted popups (a Select's) sit in the DOM hidden while closed, and animating those throws.
const rendered = (el: HTMLElement) =>
  typeof el.checkVisibility === 'function' ? el.checkVisibility() : el.getClientRects().length > 0;

/** Springs a Base UI popup in when it mounts or reopens, and out when it closes. Pass `open` for a popup
    that also closes from outside its root's onOpenChange (a shortcut, a store), and skip onOpenChange. */
export const usePopupMotion = (kind: PopupKind, open?: boolean) => {
  const reduce = useReduceMotion();
  const node = useRef<HTMLElement | null>(null);
  const entered = useRef<WeakSet<HTMLElement>>(new WeakSet());
  const running = useRef<Running>([]);
  const retrying = useRef(0);
  const mounted = useRef(false);

  const play = useCallback(
    (start: Start, retry = true) => {
      cancelAnimationFrame(retrying.current);
      const el = node.current;
      // Moving along a tooltip group swaps at once; menus wear data-instant too, so only tips skip.
      const instant = kind === 'tip' && el?.hasAttribute('data-instant');
      if (!el || reduce || !canAnimate || instant) {
        return;
      }
      if (!rendered(el)) {
        if (start !== enterPopup) {
          return;
        }
        // An opening popup may become visible a frame after its open state changes; past that, it
        // opens without the entrance, and must not keep the faded-out end of its last exit.
        if (retry) {
          retrying.current = requestAnimationFrame(() => play(start, false));
        } else {
          resetPopup(el);
        }
        return;
      }
      // cancel, not stop: stop commits styles, which throws once Base UI has hidden the element.
      for (const a of running.current) {
        a.cancel();
      }
      running.current = start(el, kind);
    },
    [kind, reduce],
  );

  // Base UI re-attaches refs as it renders; only a new element gets the entrance.
  const ref = useCallback(
    (el: HTMLElement | null) => {
      node.current = el;
      if (!el || entered.current.has(el)) {
        return;
      }
      entered.current.add(el);
      mounted.current = true;
      play(enterPopup);
    },
    [play],
  );

  // A layout effect runs before Base UI looks for exit animations, so it waits for this one.
  const was = useRef(open);
  useLayoutEffect(() => {
    if (open === undefined || open === was.current) {
      return;
    }
    was.current = open;
    // Mounting in this same commit already played the entrance.
    const justMounted = mounted.current;
    mounted.current = false;
    if (open && justMounted) {
      return;
    }
    play(open ? enterPopup : leavePopup);
  }, [open, play]);

  return {
    ref,
    /** Call from the root's onOpenChange; reopening a kept-mounted popup springs it in again. */
    onOpenChange: (open: boolean, details?: { reason?: string }) => {
      // A tip closed because a sibling in its group opened (reason "none") swaps out at once; Base UI
      // marks it data-instant only after this call.
      if (!open && kind === 'tip' && details?.reason === 'none') {
        for (const a of running.current) {
          a.cancel();
        }
        running.current = [];
        return;
      }
      play(open ? enterPopup : leavePopup);
    },
  };
};
