import type { AnyRouter, ParsedLocation } from '@tanstack/react-router';

/* Page transitions, the TanStack Router way: the router's `defaultViewTransition.types` names each
   navigation (`page`, the effect, the direction), a link overrides with `viewTransition={{ types }}`, and
   Page.module.css styles them with :active-view-transition-type(). Without type support, browsers crossfade. */

/** How a page arrives: a crossfade, a zoom in (deeper) or out (back up), or nothing. */
export type PageEffect = 'fade' | 'zoom' | false;

declare module '@tanstack/react-router' {
  // biome-ignore lint/style/useConsistentTypeDefinitions: module augmentation merges into the library's interface
  interface StaticDataRouteOption {
    /** How this page arrives. Unset: zoom between levels, fade between siblings. */
    transition?: PageEffect;
    /** Moves between this route's children are its own animation, never a page transition. */
    animatesChildren?: boolean;
  }
}

type ChangeInfo = {
  fromLocation?: ParsedLocation | undefined;
  toLocation: ParsedLocation;
  pathChanged: boolean;
};

const depth = (pathname: string) => pathname.split('/').filter(Boolean).length;

const reduceMotion = (): boolean => {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/** The view-transition types for one navigation, or false for none. */
export const pageTypes = (declared: PageEffect | undefined, info: ChangeInfo): string[] | false => {
  const from = info.fromLocation;
  if (!from || !info.pathChanged || declared === false || reduceMotion()) {
    return false;
  }
  const a = depth(from.pathname);
  const b = depth(info.toLocation.pathname);
  const direction = b > a ? 'forward' : b < a ? 'back' : 'across';
  const effect = declared ?? (direction === 'across' ? 'fade' : 'zoom');
  return ['page', `page-${effect}`, `page-${direction}`];
};

/** For one link or navigate call: `viewTransition={pageTransition("fade")}`; false turns it off. */
export const pageTransition = (
  effect: PageEffect,
): false | { types: (info: ChangeInfo) => string[] | false } => {
  return effect === false
    ? false
    : { types: (info: ChangeInfo): string[] | false => pageTypes(effect, info) };
};

let router: AnyRouter | undefined;
let uaAnimated = false;

/** The router's `defaultViewTransition`: the destination route's declared effect, else inferred. */
export const pageViewTransition = {
  types: (info: ChangeInfo): string[] | false => {
    // A back swipe the browser already animated (iOS, Android gestures) is not animated twice.
    if (uaAnimated || !router) {
      return false;
    }
    const to = router.matchRoutes(info.toLocation);
    const from = info.fromLocation ? router.matchRoutes(info.fromLocation) : [];
    const within = to.some(
      (m) => m.staticData?.animatesChildren && from.some((f) => f.routeId === m.routeId),
    );
    if (within) {
      return false;
    }
    const declared = to.findLast((m) => m.staticData?.transition !== undefined)?.staticData
      .transition;
    return pageTypes(declared, info);
  },
};

/** Call once, right after creating the router, so route-declared effects can be read. */
export const installPageTransitions = (r: AnyRouter): void => {
  router = r;
  if (typeof window === 'undefined') {
    return;
  }
  // Capture runs before the router's own popstate listener.
  window.addEventListener(
    'popstate',
    (e) => {
      uaAnimated = 'hasUAVisualTransition' in e && e.hasUAVisualTransition === true;
    },
    { capture: true },
  );
  r.subscribe('onResolved', () => {
    uaAnimated = false;
  });
};
