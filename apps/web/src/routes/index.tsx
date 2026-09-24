import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "../components/Landing.tsx";
import { siteProfile } from "../content/profile.ts";

/* The front door: the business card. Entering the site goes to /home, which the card turns into. */
export const Route = createFileRoute("/")({
  // The card has its own morph from the brand; arriving any other way (browser back) is a crossfade.
  staticData: { transition: "fade" },
  component: () => <Landing profile={siteProfile} />,
  head: () => ({
    meta: [{ title: siteProfile.name }, { name: "description", content: siteProfile.tagline }],
  }),
});
