import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "../components/Landing.tsx";
import { siteProfile } from "../content/profile.ts";

/* The front door: the business card, whose faces are its children (the front at /, the contact side at
   /contact) so one card stays mounted and turns over between them. Entering the site goes to /home. */
export const Route = createFileRoute("/_card")({
  // The card has its own morph from the brand; arriving any other way (browser back) is a crossfade.
  staticData: { transition: "fade", animatesChildren: true },
  component: () => <Landing profile={siteProfile} />,
  head: () => ({
    meta: [{ title: siteProfile.name }, { name: "description", content: siteProfile.tagline }],
  }),
});
