import type { CSSProperties } from 'react';
import { flushSync } from 'react-dom';

let current: ViewTransition | null = null;

/* Same-document view transitions for changes that reflow the card. The browser snapshots the page
   before and after and morphs each named element between them, so a layout change (a column count, an
   alignment, the card's width) animates instead of snapping. `data-vt` on <html> names the transition
   for its duration so CSS can scope names and timings to it. Without support, or with reduced motion,
   the change is immediate.

   `update` runs inside flushSync, so a state change is on screen before the new snapshot. An update that
   returns a promise (a navigation) holds the new snapshot until it settles. Resolves once the update is
   done, not when the animation ends. */
export const withViewTransition = (
  kind: string,
  update: () => unknown,
  reduce: boolean,
): Promise<void> => {
  const run = () => Promise.resolve(flushSync(update)).then(() => undefined);
  if (reduce || typeof document.startViewTransition !== 'function') {
    return run();
  }
  const root = document.documentElement;
  root.dataset.vt = kind;
  const transition = document.startViewTransition(run);
  current = transition;
  // A transition started over this one skips it; clearing then would strip the new one's timings.
  void transition.finished.finally(() => {
    if (current !== transition) {
      return;
    }
    current = null;
    delete root.dataset.vt;
  });
  return transition.updateCallbackDone;
};

/** Style that gives an element a view-transition name while a scoped transition runs (see `.vt`). */
export const vtName = (name: string): CSSProperties => ({ '--vt-name': name }) as CSSProperties;

/** Pairs a card link's icon and label with the same link's in the site footer, so entering and leaving
    move each on its own: icons match at every size, and a label the footer hides shrinks into it (see
    `.toFooter` in Landing.module.css and `.link` in SiteFooter.module.css). */
export const footerLinkName = (group: number, index: number): CSSProperties =>
  ({
    // The whole link, for the footer's own expand and collapse.
    '--vt-footer-link': `footer-link-${group}-${index}`,
    '--vt-footer-icon': `footer-icon-${group}-${index}`,
    '--vt-footer-label': `footer-label-${group}-${index}`,
  }) as CSSProperties;

/** Pairs a link group's heading on the card with its heading in the site footer, the same way. */
export const footerHeadingName = (group: number): CSSProperties =>
  ({
    // The whole heading, for the footer's own expand and collapse.
    '--vt-footer': `footer-heading-${group}`,
    // Its words alone, between card and footer, so the text matches at every size.
    '--vt-footer-heading': `footer-heading-text-${group}`,
  }) as CSSProperties;
