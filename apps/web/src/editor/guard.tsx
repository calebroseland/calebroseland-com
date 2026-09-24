import { Navigate, redirect } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useCurrentHref } from "../hooks/useCurrentHref.ts";
import { useSignedIn } from "./auth/hooks.ts";
import { dropUnavailableSession } from "./auth/methods.ts";
import { session } from "./auth/store.ts";
import { EditorProvider } from "./EditorProvider.tsx";

/** Route guard for the editing routes: no usable session, no entry; /login sends the visitor back. */
export async function requireEditor({ location }: { location: { href: string } }) {
  await dropUnavailableSession();
  if (session.store.state.status !== "authenticated") {
    throw redirect({ to: "/login", search: { returnTo: location.href } });
  }
}

/* beforeLoad guards navigation; this guards the render, so signing out while an editing route is
   mounted swaps to a redirect instead of rendering children without a client. */
export function EditorRoute({ children }: { children: ReactNode }) {
  const signedIn = useSignedIn();
  const href = useCurrentHref();
  if (!signedIn) return <Navigate to="/login" search={{ returnTo: href }} replace />;
  return <EditorProvider>{children}</EditorProvider>;
}
