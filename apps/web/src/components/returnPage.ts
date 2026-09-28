import type { AnyRouter } from "@tanstack/react-router";

/* Where the card's Enter goes: back to the last page seen outside the card (it can be reached from
   anywhere, through the palette or the brand), or home when the visit started on the card. */

const HOME = "/home";
let last: string | undefined;

/** Call once, right after creating the router. */
export function trackReturnPage(router: AnyRouter): () => void {
  last = undefined;
  return router.subscribe("onResolved", ({ toLocation }) => {
    const ids = router.state.matches.map((m) => m.routeId as string);
    // Signing in is a detour, not a place to come back to.
    if (!ids.some((id) => id === "/_card" || id.startsWith("/login"))) last = toLocation.href;
  });
}

/** The page Enter returns to. */
export const returnPage = (): string => last ?? HOME;
