import type { AnyRouter, ParsedLocation } from "@tanstack/react-router";

/* Page transitions: same-document view transitions started by the router, typed per navigation so CSS
   (Page.module.css) can pick the animation. A route can declare its effect in `staticData.transition`,
   a link can override it with `viewTransition={pageTransition(…)}`, and the direction comes from the
   paths: deeper is forward, shallower is back. Changes to search or hash only, the first load, and
   reduced motion get no transition. Browsers without view transitions change instantly. */

/** How a page arrives: a crossfade, a short slide in the direction of travel, or nothing. */
export type PageEffect = "fade" | "slide" | false;

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    /** How this page arrives. Unset: slide between levels, fade between siblings. */
    transition?: PageEffect;
  }
}

type ChangeInfo = {
  fromLocation?: ParsedLocation;
  toLocation: ParsedLocation;
  pathChanged: boolean;
};

const depth = (pathname: string) => pathname.split("/").filter(Boolean).length;

function reduceMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The view-transition types for one navigation, or false for none. */
export function typesFor(effect: PageEffect | undefined, info: ChangeInfo): string[] | false {
  const from = info.fromLocation;
  if (!from || !info.pathChanged || effect === false || reduceMotion()) return false;
  const a = depth(from.pathname);
  const b = depth(info.toLocation.pathname);
  const direction = b > a ? "forward" : b < a ? "back" : "across";
  const chosen = effect ?? (direction === "across" ? "fade" : "slide");
  return ["page", `page-${chosen}`, `page-${direction}`];
}

/** The router's default: the destination route's declared effect, else inferred. The router is
    bound after it is created, since its own options hold this. */
export function routeTransitions() {
  let router: AnyRouter | undefined;
  return {
    bind: (r: AnyRouter) => {
      router = r;
    },
    types: (info: ChangeInfo): string[] | false => {
      const declared = router
        ?.matchRoutes(info.toLocation)
        .findLast((m) => m.staticData?.transition !== undefined)?.staticData.transition;
      return typesFor(declared, info);
    },
  };
}

/** For one link or navigate call: `viewTransition={pageTransition("fade")}`; false turns it off. */
export function pageTransition(effect: PageEffect) {
  return effect === false ? false : { types: (info: ChangeInfo) => typesFor(effect, info) };
}
