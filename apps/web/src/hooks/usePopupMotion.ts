import { useCallback, useRef } from "react";
import {
  canAnimate,
  enterPopup,
  leavePopup,
  type PopupKind,
} from "../components/motion/presets.ts";
import { useReduceMotion } from "./useReduceMotion.ts";

type Running = ReturnType<typeof enterPopup>;

/** Springs a Base UI popup in when it mounts or reopens, and out when it closes. */
export function usePopupMotion(kind: PopupKind) {
  const reduce = useReduceMotion();
  const node = useRef<HTMLElement | null>(null);
  const running = useRef<Running>([]);

  const play = useCallback(
    (start: (el: HTMLElement, kind: PopupKind) => Running) => {
      const el = node.current;
      // Moving along a tooltip group swaps at once; menus wear data-instant too, so only tips skip.
      const instant = kind === "tip" && el?.hasAttribute("data-instant");
      if (!el || reduce || !canAnimate || instant) return;
      for (const a of running.current) a.stop();
      running.current = start(el, kind);
    },
    [kind, reduce],
  );

  // Stable, so a re-render while open never replays the entrance.
  const ref = useCallback(
    (el: HTMLElement | null) => {
      node.current = el;
      if (el) play(enterPopup);
    },
    [play],
  );

  return {
    ref,
    /** Call from the root's onOpenChange; a reopen during the exit springs back in. */
    onOpenChange: (open: boolean) => play(open ? enterPopup : leavePopup),
  };
}
