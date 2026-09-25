import type { AnyRouter, ParsedLocation } from "@tanstack/react-router";

/* Page transitions: same-document view transitions started by the router. When a navigation starts,
   the effect is written to <html data-page="…">, and Page.module.css animates the page's snapshot by
   it. The attribute, not view-transition types, carries the effect, so it works wherever view
   transitions do (Chrome, Edge, Safari 18+ on macOS and iOS, Firefox); elsewhere the change is
   instant. The snapshot is the whole viewport, so it holds for any page's width, length or scroll.

   A route declares its effect in `staticData.transition`; a link overrides it through history state,
   `<Link state={{ transition: "fade" }}>`; unset, pages slide between levels (deeper is forward,
   shallower is back) and fade between siblings. Search or hash changes, the first load, reduced motion
   and a back swipe the browser already animated (iOS) get none. */

/** How a page arrives: a crossfade, a short slide in the direction of travel, or nothing. */
export type PageEffect = "fade" | "slide" | false;

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    /** How this page arrives. Unset: slide between levels, fade between siblings. */
    transition?: PageEffect;
  }
}

declare module "@tanstack/history" {
  interface HistoryState {
    /** How the page this entry leads to arrives; overrides the route's own. */
    transition?: PageEffect;
  }
}

type ChangeInfo = {
  fromLocation?: ParsedLocation | undefined;
  toLocation: ParsedLocation;
  pathChanged: boolean;
};

const depth = (pathname: string) => pathname.split("/").filter(Boolean).length;

function reduceMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The effect and direction for one navigation, as the `data-page` value, or "none". */
export function pageEffect(declared: PageEffect | undefined, info: ChangeInfo): string {
  const from = info.fromLocation;
  if (!from || !info.pathChanged || declared === false || reduceMotion()) return "none";
  const a = depth(from.pathname);
  const b = depth(info.toLocation.pathname);
  const direction = b > a ? "forward" : b < a ? "back" : "across";
  return `${declared ?? (direction === "across" ? "fade" : "slide")} ${direction}`;
}

/** Writes each navigation's effect to <html data-page>: call once, right after creating the router. */
export function installPageTransitions(router: AnyRouter): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // A back swipe on iOS (and gesture navigation on Android) has already animated by the time the
  // router hears of it. The flag is read before the router's own popstate listener runs.
  let uaAnimated = false;
  window.addEventListener(
    "popstate",
    (e) => {
      uaAnimated = "hasUAVisualTransition" in e && e.hasUAVisualTransition === true;
    },
    { capture: true },
  );

  router.subscribe("onBeforeNavigate", (info) => {
    const declared =
      info.toLocation.state.transition ??
      router.matchRoutes(info.toLocation).findLast((m) => m.staticData?.transition !== undefined)
        ?.staticData.transition;
    root.dataset.page = uaAnimated ? "none" : pageEffect(declared, info);
    uaAnimated = false;
  });
}

/** The router's `defaultViewTransition`. Where the browser supports transition types, a navigation
    with nothing to animate skips the transition entirely; elsewhere "none" makes it an instant swap. */
export const pageViewTransition = {
  types: (): string[] | false =>
    typeof document !== "undefined" && document.documentElement.dataset.page === "none"
      ? false
      : ["page"],
};
