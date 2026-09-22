import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { Home } from "../components/Home.tsx";
import { Landing } from "../components/Landing.tsx";
import { siteProfile } from "../content/profile.ts";

/* One path, two states: the card, and the site past it once the visitor enters. The state lives in the
   history entry, so a fresh visit or a shared link shows the card, while Back, Forward and reload keep
   the visitor where they were. */
declare module "@tanstack/react-router" {
  interface HistoryState {
    entered?: boolean;
  }
}

export const Route = createFileRoute("/")({
  component: IndexRoute,
  head: () => ({
    meta: [{ title: siteProfile.name }, { name: "description", content: siteProfile.tagline }],
  }),
});

function IndexRoute() {
  const entered = useRouterState({ select: (s) => s.location.state.entered === true });
  return entered ? <Home /> : <Landing profile={siteProfile} />;
}
