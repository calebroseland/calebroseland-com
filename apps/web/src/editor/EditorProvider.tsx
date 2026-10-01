import type { GitHubClient } from "@crc/github-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { session } from "./auth/store.ts";
import { type Capabilities, capabilitiesOf } from "./data/backend.ts";
import { editorQueryClient } from "./data/queryClient.ts";
import { clientFor } from "./github/client.ts";

const GitHubContext = createContext<GitHubClient | null>(null);

/** The client for whoever is signed in, rebuilt only when the session changes. */
function useSessionClient(): GitHubClient | null {
  const current = useStore(session.store);
  return useMemo(() => (current.status === "authenticated" ? clientFor(current) : null), [current]);
}

/** Gives an editing surface the shared query client and the signed-in backend. */
export function EditorProvider({ children }: { children: ReactNode }) {
  const gh = useSessionClient();
  return (
    <QueryClientProvider client={editorQueryClient()}>
      <GitHubContext.Provider value={gh}>{children}</GitHubContext.Provider>
    </QueryClientProvider>
  );
}

export function useGitHub(): GitHubClient {
  const gh = useContext(GitHubContext);
  if (!gh) throw new Error("useGitHub outside an authenticated editor route");
  return gh;
}

/** What the signed-in backend can do: branches, publishing, deploys, and its name. */
export function useCapabilities(): Capabilities {
  return capabilitiesOf(useGitHub().kind);
}
