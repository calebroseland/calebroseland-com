import { createFileRoute, redirect } from "@tanstack/react-router";
import { hasContact, siteProfile } from "../content/profile.ts";

/** The card's contact side; the layout renders it. A card without contact details has only a front. */
export const Route = createFileRoute("/_card/contact")({
  beforeLoad: () => {
    if (!hasContact(siteProfile)) throw redirect({ to: "/", replace: true });
  },
  head: () => ({ meta: [{ title: `Contact · ${siteProfile.name}` }] }),
});
