import { AuthError, type GitHubClient } from "@crc/github-client";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import { session } from "./auth/store.ts";
import { clientFor } from "./github/client.ts";

const GitHubContext = createContext<GitHubClient | null>(null);

/** Query client scoped to the editor: created lazily so the public site never pays for it. */
export function EditorProvider({ children }: { children: ReactNode }) {
  const current = useStore(session.store);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 30_000 }, mutations: { retry: 0 } },
        queryCache: new QueryCache({
          onError: (err) => {
            // A rejected token anywhere ends the session; the route guard then redirects to login with the buffer intact.
            if (err instanceof AuthError) session.signOut();
          },
        }),
      }),
  );
  const gh = useMemo(
    () => (current.status === "authenticated" ? clientFor(current) : null),
    [current],
  );
  return (
    <QueryClientProvider client={queryClient}>
      <GitHubContext.Provider value={gh}>{children}</GitHubContext.Provider>
    </QueryClientProvider>
  );
}

export function useGitHub(): GitHubClient {
  const gh = useContext(GitHubContext);
  if (!gh) throw new Error("useGitHub outside an authenticated editor route");
  return gh;
}
