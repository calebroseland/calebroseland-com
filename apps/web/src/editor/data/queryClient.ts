import { MutationCache, QueryClient, type QueryKey } from '@tanstack/react-query';

declare module '@tanstack/react-query' {
  // biome-ignore lint/style/useConsistentTypeDefinitions: module augmentation merges into the library's interface
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

export const editorQueryClient = (): QueryClient => {
  if (client) {
    return client;
  }
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 }, mutations: { retry: 0 } },
    mutationCache: new MutationCache({
      onSuccess: (_data, _variables, _result, mutation) =>
        Promise.all(
          (mutation.meta?.invalidates ?? []).map((queryKey) => qc.invalidateQueries({ queryKey })),
        ),
    }),
  });
  client = qc;
  return qc;
};
