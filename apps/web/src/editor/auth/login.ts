import { fetchAuthConfig } from "./api.ts";
import { authorizeUrl, createChallenge, createState, createVerifier } from "./pkce.ts";
import { saveHandshake } from "./store.ts";

export const callbackUrl = () =>
  new URL(
    `${import.meta.env.BASE_URL.replace(/\/$/, "")}/login/callback`,
    window.location.origin,
  ).toString();

/** Starts the GitHub OAuth leg. Throws if the environment has no client id (the login page then shows alternatives). */
export async function startGitHubLogin(
  returnTo: string,
  navigate: (url: string) => void = (url) => window.location.assign(url),
) {
  const config = await fetchAuthConfig();
  if (!config.enabled || !config.clientId)
    throw new Error("GitHub sign-in is not configured for this environment.");
  const verifier = createVerifier();
  const state = createState();
  saveHandshake({ verifier, state, returnTo });
  navigate(
    authorizeUrl({
      clientId: config.clientId,
      redirectUri: callbackUrl(),
      state,
      challenge: await createChallenge(verifier),
    }),
  );
}
