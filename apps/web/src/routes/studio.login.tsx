import { Stack } from "@crc/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import * as z from "zod/mini";
import { CenteredMessage, Page } from "../components/Page.tsx";
import { fetchAuthConfig } from "../studio/auth/api.ts";
import { startGitHubLogin } from "../studio/auth/login.ts";
import { session } from "../studio/auth/store.ts";
import styles from "../studio/studio.module.css";

export const Route = createFileRoute("/studio/login")({
  validateSearch: z.object({ returnTo: z.optional(z.string()), error: z.optional(z.string()) }),
  head: () => ({ meta: [{ title: "Studio · Sign in" }, { name: "robots", content: "noindex" }] }),
  component: LoginRoute,
});

function LoginRoute() {
  const { returnTo, error } = Route.useSearch();
  const navigate = useNavigate();
  const target = returnTo?.startsWith("/studio") ? returnTo : "/studio";
  const config = useQuery({
    queryKey: ["auth", "config"],
    queryFn: () => fetchAuthConfig(),
    staleTime: Number.POSITIVE_INFINITY,
  });
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [token, setToken] = useState("");

  const oauth = async () => {
    setBusy(true);
    try {
      await startGitHubLogin(target);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };
  const useFake = () => {
    session.signIn({ status: "authenticated", backend: "fake", token: "fake" });
    void navigate({ to: target });
  };
  const useWorkingTree = () => {
    session.signIn({ status: "authenticated", backend: "local", token: "local" });
    void navigate({ to: target });
  };
  const useToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    session.signIn({ status: "authenticated", backend: "octokit", token: token.trim() });
    void navigate({ to: target });
  };

  const oauthReady = config.data?.enabled === true;
  const showAlternatives = import.meta.env.DEV || config.data?.enabled === false;
  const message = localError ?? (error ? decodeURIComponent(error) : null);

  return (
    <Page width="measure">
      <CenteredMessage title="Studio">
        <Stack gap="6" align="center">
          {message && (
            <p role="alert" className={styles.alert}>
              {message}
            </p>
          )}
          <p className={styles.muted}>
            You'll be asked to authorise access to the calebroseland-com repository.
          </p>
          <button
            type="button"
            className={styles.primary}
            onClick={oauth}
            disabled={busy || !oauthReady}
            aria-busy={busy}
          >
            {busy ? "Redirecting…" : "Sign in with GitHub"}
          </button>
          {config.data?.enabled === false && (
            <p className={styles.muted}>GitHub sign-in isn't configured for this environment.</p>
          )}
          {showAlternatives && (
            <details className={styles.details}>
              <summary>Developer options</summary>
              <Stack gap="4">
                <button type="button" className={styles.secondary} onClick={useWorkingTree}>
                  Edit files on this branch
                </button>
                <button type="button" className={styles.secondary} onClick={useFake}>
                  Use local fake GitHub
                </button>
                <form onSubmit={useToken} className={styles.tokenForm}>
                  <label htmlFor="pat">Personal access token</label>
                  <input
                    id="pat"
                    type="password"
                    autoComplete="off"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className={styles.input}
                  />
                  <button type="submit" className={styles.secondary} disabled={!token.trim()}>
                    Use token
                  </button>
                </form>
                <p className={styles.muted}>
                  Editing this branch writes the real files in <code>content/</code>: the change is
                  yours to commit, alongside any code change. The fake GitHub instead simulates
                  branches and pull requests in memory. A token stays in this tab's session storage
                  and is sent only to api.github.com.
                </p>
              </Stack>
            </details>
          )}
        </Stack>
      </CenteredMessage>
    </Page>
  );
}
