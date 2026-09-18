import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "../components/Landing.tsx";
import { siteProfile } from "../content/profile.ts";

export const Route = createFileRoute("/")({
  component: () => <Landing profile={siteProfile} />,
  head: () => ({
    meta: [{ title: siteProfile.name }, { name: "description", content: siteProfile.tagline }],
  }),
});
