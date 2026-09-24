import { Stack } from "@crc/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as z from "zod/mini";
import { CenteredMessage, Page } from "../components/Page.tsx";
import {
  useDirectSignIn,
  useGitHubSignIn,
  useSignInMethods,
  useTokenField,
} from "../editor/auth/hooks.ts";
import { canSignIn, type SignInMethods } from "../editor/auth/methods.ts";
import styles from "../editor/editor.module.css";

export const Route = createFileRoute("/login/")({
  validateSearch: z.object({ returnTo: z.optional(z.string()), error: z.optional(z.string()) }),
  head: () => ({ meta: [{ title: "Sign in" }, { name: "robots", content: "noindex" }] }),
  component: LoginRoute,
});

/** Where to go once signed in: back to an editing page, or to the editor. */
function useLoginSearch() {
  const { returnTo, error } = Route.useSearch();
  return {
    target: returnTo?.startsWith("/editor") ? returnTo : "/editor",
    error: error ? decodeURIComponent(error) : null,
  };
}

function LoginRoute() {
  const { target, error } = useLoginSearch();
  const methods = useSignInMethods();

  if (!methods)
    return (
      <Page width="measure">
        <CenteredMessage title="Sign in">
          <p className={styles.muted} aria-busy="true">
            Checking how you can sign in here…
          </p>
        </CenteredMessage>
      </Page>
    );
  if (!canSignIn(methods))
    return (
      <Page width="measure">
        <CenteredMessage title="Sign in">
          <p className={styles.muted}>Editing isn't available on this site.</p>
          <p>
            <Link to="/home">Back to the site</Link>
          </p>
        </CenteredMessage>
      </Page>
    );
  return (
    <Page width="measure">
      <CenteredMessage title="Sign in">
        <Stack gap="6" align="center">
          {error && (
            <p role="alert" className={styles.alert}>
              {error}
            </p>
          )}
          {methods.github ? (
            <GitHubSignIn target={target} methods={methods} />
          ) : (
            // GitHub editing is off: the working tree is the editor, so it leads.
            <WorkingTreeOption target={target} primary />
          )}
        </Stack>
      </CenteredMessage>
    </Page>
  );
}

/** OAuth first, with the working tree, the fake GitHub and a pasted token as developer options. */
function GitHubSignIn({ target, methods }: { target: string; methods: SignInMethods }) {
  const github = useGitHubSignIn(target);
  const signIn = useDirectSignIn(target);
  const token = useTokenField();
  return (
    <>
      {github.error && (
        <p role="alert" className={styles.alert}>
          {github.error}
        </p>
      )}
      <p className={styles.muted}>
        You'll be asked to authorise access to the calebroseland-com repository.
      </p>
      <button
        type="button"
        className={styles.primary}
        onClick={github.start}
        disabled={github.busy || !methods.oauth}
        aria-busy={github.busy}
      >
        {github.busy ? "Redirecting…" : "Sign in with GitHub"}
      </button>
      {!methods.oauth && (
        <p className={styles.muted}>GitHub sign-in isn't configured for this environment.</p>
      )}
      <details className={styles.details}>
        <summary>Developer options</summary>
        <Stack gap="5">
          {methods.workingTree && <WorkingTreeOption target={target} />}
          <div className={styles.option}>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => signIn("fake", "fake")}
            >
              Use local fake GitHub
            </button>
            <p className={styles.muted}>
              Simulates branches, pull requests and merges in this browser, starting from a copy of
              the site's content.
            </p>
          </div>
          <div className={styles.option}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (token.value) signIn("octokit", token.value);
              }}
              className={styles.tokenForm}
            >
              <label htmlFor="pat">Personal access token</label>
              <input
                id="pat"
                type="password"
                autoComplete="off"
                value={token.token}
                onChange={(e) => token.setToken(e.target.value)}
                className={styles.input}
              />
              <button type="submit" className={styles.secondary} disabled={!token.value}>
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
    </>
  );
}

function WorkingTreeOption({ target, primary = false }: { target: string; primary?: boolean }) {
  const signIn = useDirectSignIn(target);
  return (
    <div className={primary ? `${styles.option} ${styles.leadOption}` : styles.option}>
      <button
        type="button"
        className={primary ? styles.primary : styles.secondary}
        onClick={() => signIn("local", "local")}
      >
        Edit files on this branch
      </button>
      <p className={styles.muted}>
        Writes the real files in <code>content/</code> on the branch you have checked out. There are
        no branches or pull requests: the change is yours to commit, alongside any code change.
      </p>
    </div>
  );
}
