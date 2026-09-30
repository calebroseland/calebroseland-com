import { createFileRoute, redirect } from "@tanstack/react-router";
import * as z from "zod/mini";
import { CenteredMessage, Page } from "../components/Page.tsx";
import { exchangeCode } from "../editor/auth/api.ts";
import { afterSignIn, callbackUrl } from "../editor/auth/login.ts";
import { session, takeHandshake } from "../editor/auth/store.ts";

/* GitHub lands here with ?code&state. The handshake is single-use; any mismatch goes back to login with a message. */
export const Route = createFileRoute("/login/callback")({
  validateSearch: z.object({
    code: z.optional(z.string()),
    state: z.optional(z.string()),
    error_description: z.optional(z.string()),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const fail = (msg: string) => redirect({ to: "/login", search: { error: msg } });
    if (deps.error_description) throw fail(deps.error_description);
    const handshake = takeHandshake();
    if (!deps.code || !deps.state || !handshake || handshake.state !== deps.state)
      throw fail("Sign-in didn't complete. Try again.");
    try {
      const token = await exchangeCode({
        code: deps.code,
        codeVerifier: handshake.verifier,
        redirectUri: callbackUrl(),
      });
      session.signIn({
        status: "authenticated",
        backend: "octokit",
        token: token.accessToken,
        ...(token.expiresAt ? { expiresAt: token.expiresAt } : {}),
      });
    } catch (e) {
      throw fail(e instanceof Error ? e.message : "Sign-in didn't complete. Try again.");
    }
    throw redirect({ href: afterSignIn(handshake.returnTo) });
  },
  component: () => (
    <Page>
      <CenteredMessage title="Signing in…" />
    </Page>
  ),
});
