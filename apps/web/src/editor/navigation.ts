import { useNavigate } from "@tanstack/react-router";
import { useCurrentHref } from "../hooks/useCurrentHref.ts";
import type { EntryKind } from "./drafts/paths.ts";

/* Where the editor sends people next, as small hooks returning the move. */

export function useOpenInEditor() {
  const navigate = useNavigate();
  return (slug: string) => navigate({ to: "/editor/$slug", params: { slug } });
}

/** The live page for an entry: a page at its own address, a post under /posts. */
export function useShowLive() {
  const navigate = useNavigate();
  return (entry: { kind: EntryKind; slug: string }) =>
    entry.kind === "page"
      ? navigate({ to: "/$slug", params: { slug: entry.slug } })
      : navigate({ to: "/posts/$slug", params: { slug: entry.slug } });
}

/** An in-app address kept from before signing in. */
export function useReturnTo() {
  const navigate = useNavigate();
  return (href: string) => navigate({ to: href });
}

/** The account menu's moves: the board, a new entry, and signing in to come back here. */
export function useAccountLinks() {
  const navigate = useNavigate();
  const href = useCurrentHref();
  return {
    board: () => void navigate({ to: "/editor" }),
    newEntry: () => void navigate({ to: "/editor/new" }),
    signIn: () => void navigate({ to: "/login", search: { returnTo: href } }),
  };
}
