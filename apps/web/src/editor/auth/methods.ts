import { fetchAuthConfig } from './api.ts';
import { type Backend, session } from './store.ts';

/* The ways to sign in here. Editing files on disk needs the dev server; everything through GitHub
   (OAuth, a pasted token, the fake GitHub that stands in for it) is experimental and needs the
   Worker's FEATURE_GITHUB_EDITING flag. A site without a Worker (the Pages backup) offers GitHub
   nothing. */

export type SignInMethods = {
  /** Edit content/ on the checked-out branch through the dev server. */
  workingTree: boolean;
  /** GitHub editing is on: the fake GitHub and pasted tokens. */
  github: boolean;
  /** GitHub editing is on and its OAuth app is configured. */
  oauth: boolean;
};

let pending: Promise<SignInMethods> | undefined;

/** Asked of the Worker once per page load, and only when something needs to know. */
export function signInMethods(): Promise<SignInMethods> {
  pending ??= fetchAuthConfig().then(
    (c) => ({ workingTree: import.meta.env.DEV, github: c.github, oauth: c.oauth }),
    () => ({ workingTree: import.meta.env.DEV, github: false, oauth: false }),
  );
  return pending;
}

export const canSignIn = (m: SignInMethods): boolean => m.workingTree || m.github;

const allows = (m: SignInMethods, backend: Backend): boolean =>
  backend === 'local' ? m.workingTree : m.github;

/** Ends a session kept from before a flag changed, or from another environment, that this site can
    no longer serve. */
export async function dropUnavailableSession(): Promise<void> {
  const current = session.store.state;
  if (current.status !== 'authenticated') {
    return;
  }
  if (!allows(await signInMethods(), current.backend)) {
    session.signOut();
  }
}
