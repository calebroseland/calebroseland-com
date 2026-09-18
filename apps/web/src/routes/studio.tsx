import { createFileRoute, Navigate, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import * as z from "zod/mini";
import { session } from "../studio/auth/store.ts";
import { StudioProvider } from "../studio/StudioProvider.tsx";

/* Layout for everything under /studio. Public sub-routes (login, callback) opt out of the guard by name. */
const PUBLIC = new Set(["/studio/login", "/studio/callback"]);

export const Route = createFileRoute("/studio")({
  validateSearch: z.object({ returnTo: z.optional(z.string()) }),
  beforeLoad: ({ location }) => {
    if (PUBLIC.has(location.pathname.replace(/\/$/, ""))) return;
    if (session.store.state.status !== "authenticated") {
      throw redirect({ to: "/studio/login", search: { returnTo: location.href } });
    }
  },
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: StudioLayout,
});

/* beforeLoad guards navigation; this guards the render, so signing out while a studio route is
   mounted swaps to a redirect instead of rendering children without a client. */
function StudioLayout() {
  const current = useStore(session.store);
  const location = useLocation();
  const isPublic = PUBLIC.has(location.pathname.replace(/\/$/, ""));
  if (!isPublic && current.status !== "authenticated") {
    return <Navigate to="/studio/login" search={{ returnTo: location.href }} replace />;
  }
  return (
    <StudioProvider>
      <Outlet />
    </StudioProvider>
  );
}
