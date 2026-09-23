import { Stack } from "@crc/ui";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as z from "zod/mini";
import { CenteredMessage, Page } from "../components/Page.tsx";
import { fetchAuthConfig } from "../editor/auth/api.ts";
import { startGitHubLogin } from "../editor/auth/login.ts";
import { session } from "../editor/auth/store.ts";
import styles from "../editor/editor.module.css";

export const Route = createFileRoute("/login/")({
  validateSearch: z.object({ returnTo: z.optional(z.string()), error: z.optional(z.string()) }),
  head: () => ({ meta: [{ title: "Sign in" }, { name: "robots", content: "noindex" }] }),
  component: LoginRoute,
});

function LoginRoute() {
  const { returnTo, error } = Route.useSearch();
  const navigate = useNavigate();
  const target = returnTo?.startsWith("/editor") ? returnTo : "/editor";
  // Signing in happens outside the editing routes, so this page fetches for itself rather than
  // pulling the editor's query client into the site bundle.
  const [config, setConfig] = useState<{ enabled: boolean } | null>(null);
  useEffect(() => {
    let live = true;
    fetchAuthConfig()
      .then((c) => live && setConfig(c))
      .catch(() => live && setConfig({ enabled: false }));
    return () => {
      live = false;
    };
  }, []);
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

  const oauthReady = config?.enabled === true;
  const showAlternatives = import.meta.env.DEV || config?.enabled === false;
  const message = localError ?? (error ? decodeURIComponent(error) : null);

  return (
    <Page width="measure">
      <CenteredMessage title="Sign in">
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
          {config?.enabled === false && (
            <p className={styles.muted}>GitHub sign-in isn't configured for this environment.</p>
          )}
          {showAlternatives && (
            <details className={styles.details}>
              <summary>Developer options</summary>
              <Stack gap="5">
                <div className={styles.option}>
                  <button type="button" className={styles.secondary} onClick={useWorkingTree}>
                    Edit files on this branch
                  </button>
                  <p className={styles.muted}>
                    Writes the real files in <code>content/</code> on the branch you have checked
                    out. There are no branches or pull requests: the change is yours to commit,
                    alongside any code change.
                  </p>
                </div>
                <div className={styles.option}>
                  <button type="button" className={styles.secondary} onClick={useFake}>
                    Use local fake GitHub
                  </button>
                  <p className={styles.muted}>
                    Simulates branches, pull requests and merges in this browser. A merge writes the
                    result into <code>content/</code>, so the loop ends at a rendered page.
                  </p>
                </div>
                <div className={styles.option}>
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
                    Real GitHub, without the OAuth round trip. The token stays in this tab's session
                    storage and is sent only to api.github.com.
                  </p>
                </div>
              </Stack>
            </details>
          )}
        </Stack>
      </CenteredMessage>
    </Page>
  );
}
