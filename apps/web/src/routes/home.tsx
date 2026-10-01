import { createFileRoute } from "@tanstack/react-router";
import { Home } from "../components/Home.tsx";
import { siteProfile } from "../content/profile.ts";

/* The site behind the card. The card turns into this page (Landing's "Enter"), and the brand in the
   bar turns it back into the card. */
export const Route = createFileRoute("/home")({
  component: Home,
  head: () => ({
    meta: [
      { title: `Home · ${siteProfile.name}` },
      { name: "description", content: siteProfile.tagline },
    ],
  }),
});
