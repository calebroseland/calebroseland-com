import type { CSSProperties } from "react";
import { flushSync } from "react-dom";

/* Same-document view transitions for changes that reflow the card. The browser snapshots the page
   before and after and morphs each named element between them, so a layout change (a column count, an
   alignment, the card's width) animates instead of snapping. `data-vt` on <html> names the transition
   for its duration so CSS can scope names and timings to it. Without support, or with reduced motion,
   the change is immediate.

   `update` runs inside flushSync, so a state change is on screen before the new snapshot. An update that
   returns a promise (a navigation) holds the new snapshot until it settles. Resolves once the update is
   done, not when the animation ends. */
export function withViewTransition(
  kind: string,
  update: () => unknown,
  reduce: boolean,
): Promise<void> {
  const run = () => Promise.resolve(flushSync(update)).then(() => undefined);
  if (reduce || typeof document.startViewTransition !== "function") return run();
  const root = document.documentElement;
  root.dataset.vt = kind;
  const transition = document.startViewTransition(run);
  void transition.finished.finally(() => {
    if (root.dataset.vt === kind) delete root.dataset.vt;
  });
  return transition.updateCallbackDone;
}

/** Style that gives an element a view-transition name while a scoped transition runs (see `.vt`). */
export const vtName = (name: string): CSSProperties => ({ "--vt-name": name }) as CSSProperties;

/** Pairs a card link with the same link in the site footer, so entering and leaving move it between
    the two (see `.toFooter` in Landing.module.css and `.footerLink` in SiteFooter.module.css). */
export const footerLinkName = (group: number, index: number): CSSProperties =>
  ({ "--vt-footer": `footer-link-${group}-${index}` }) as CSSProperties;
