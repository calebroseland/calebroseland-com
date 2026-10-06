import { AuthError } from '@crc/github-client';
import { MutationCache, QueryCache, QueryClient, type QueryKey } from '@tanstack/react-query';
import { type Session, session } from '../auth/store.ts';

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** Queries a successful write makes stale; refreshed before the mutation's own onSuccess runs. */
      invalidates?: readonly QueryKey[];
    };
  }
}

/* One query client for every editing surface (the /editor routes and the landing card's editor), so
   they share a cache. Created on first use, so the public site never loads TanStack Query. */

let client: QueryClient | undefined;

// A rejected token anywhere ends the session; the route guard then redirects to login with the
// buffer intact.
const endSessionOnAuthError = (err: unknown) => {
  if (err instanceof AuthError) {
    session.signOut();
  }
};

const identity = (s: Session) =>
  s.status === 'authenticated' ? `${s.backend}:${s.token}` : 'anonymous';

export function editorQueryClient(): QueryClient {
  if (client) {
    return client;
  }
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 }, mutations: { retry: 0 } },
    queryCache: new QueryCache({ onError: endSessionOnAuthError }),
    mutationCache: new MutationCache({
      onError: endSessionOnAuthError,
      onSuccess: (_data, _variables, _result, mutation) =>
        Promise.all(
          (mutation.meta?.invalidates ?? []).map((queryKey) => qc.invalidateQueries({ queryKey })),
        ),
    }),
  });
  // Another sign-in is another repository (or the working tree): nothing cached for the last applies.
  let current = identity(session.store.state);
  session.store.subscribe((next) => {
    if (identity(next) === current) {
      return;
    }
    current = identity(next);
    qc.clear();
  });
  client = qc;
  return qc;
}
