import type { AnyRouter, ParsedLocation } from "@tanstack/react-router";

/* Page transitions. Each navigation's effect goes to <html data-page> (an attribute, not view-transition
   types, so every browser with view transitions gets it); Page.module.css animates by it. Set it per
   route (`staticData.transition`) or per link (`state={{ transition }}`); unset, deeper slides and
   siblings fade. */

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

  // A browser-animated back swipe (iOS, Android gestures); read before the router's own listener.
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
    generation++;
  });

  // The effect belongs to one navigation; clear it after, so a later non-navigation transition skips it.
  let generation = 0;
  let running = 0;
  let startedIn = 0;
  const ofTransition = (e: AnimationEvent) => e.pseudoElement.startsWith("::view-transition");
  root.addEventListener("animationstart", (e) => {
    if (ofTransition(e) && running++ === 0) startedIn = generation;
  });
  const ended = (e: AnimationEvent) => {
    if (!ofTransition(e) || --running > 0) return;
    running = 0;
    if (startedIn === generation) delete root.dataset.page;
  };
  root.addEventListener("animationend", ended);
  root.addEventListener("animationcancel", ended);
  // No transition ran at all (nothing to animate), so nothing will end: clear it now.
  router.subscribe("onResolved", () => {
    if (root.dataset.page === "none") delete root.dataset.page;
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
