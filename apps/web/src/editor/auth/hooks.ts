import { useStore } from '@tanstack/react-store';
import { useEffect, useState } from 'react';
import { ENTRY_PAGE } from '../../components/returnPage.ts';
import { useCurrentHref } from '../../hooks/useCurrentHref.ts';
import { useReturnTo } from '../navigation.ts';
import { startGitHubLogin } from './login.ts';
import { type SignInMethods, signInMethods } from './methods.ts';
import { type Backend, type Session, session } from './store.ts';

/* The session as React sees it. Reads go through these; sign-in and sign-out stay on `session`. */

export function useSession(): Session {
  return useStore(session.store);
}

export function useSignedIn(): boolean {
  return useStore(session.store, (s) => s.status === 'authenticated');
}

/** How someone can sign in here; null until known. Asks only once `needed` is true, so a page that
    merely could offer sign-in does not call the Worker on every load. */
export function useSignInMethods(needed = true): SignInMethods | null {
  const [methods, setMethods] = useState<SignInMethods | null>(null);
  useEffect(() => {
    if (!needed) {
      return;
    }
    let live = true;
    void signInMethods().then((m) => live && setMethods(m));
    return () => {
      live = false;
    };
  }, [needed]);
  return methods;
}

/** Starts the GitHub OAuth round trip; `error` explains why it could not start. */
export function useGitHubSignIn(returnTo: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = async () => {
    setBusy(true);
    try {
      await startGitHubLogin(returnTo);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };
  return { start, busy, error };
}

/** Signs in without the OAuth round trip (working tree, fake GitHub, a pasted token) and goes on. */
export function useDirectSignIn(returnTo: string) {
  const go = useReturnTo();
  return (backend: Backend, token: string) => {
    session.signIn({ status: 'authenticated', backend, token });
    void go(returnTo);
  };
}

/** Signs out, leaving the editing routes first so their guard never redirects a page mid-render. */
export function useSignOut() {
  const go = useReturnTo();
  const onEditingRoute = useCurrentHref().startsWith('/editor');
  return () => void go(onEditingRoute ? ENTRY_PAGE : '.').then(() => session.signOut());
}

/** The pasted personal access token, before it is used. */
export function useTokenField() {
  const [token, setToken] = useState('');
  return { token, setToken, value: token.trim() };
}
