import { Navigate, redirect, useLocation } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import type { ReactNode } from "react";
import { session } from "./auth/store.ts";
import { EditorProvider } from "./EditorProvider.tsx";

/** Route guard for the editing routes: no session, no entry; /login sends the visitor back. */
export function requireEditor({ location }: { location: { href: string } }) {
  if (session.store.state.status !== "authenticated") {
    throw redirect({ to: "/login", search: { returnTo: location.href } });
  }
}

/* beforeLoad guards navigation; this guards the render, so signing out while an editing route is
   mounted swaps to a redirect instead of rendering children without a client. */
export function EditorRoute({ children }: { children: ReactNode }) {
  const current = useStore(session.store, (s) => s.status);
  const location = useLocation();
  if (current !== "authenticated") {
    return <Navigate to="/login" search={{ returnTo: location.href }} replace />;
  }
  return <EditorProvider>{children}</EditorProvider>;
}
