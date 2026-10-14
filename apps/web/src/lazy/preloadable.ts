export type Preloadable<M> = {
  /** The module, loaded once; a failed load is forgotten so the next call tries again. */
  load: () => Promise<M>;
  /** The module if it has loaded, synchronously. */
  peek: () => M | null;
  /** Starts loading ahead of need; a failure is silent here and surfaces at the next `load`. */
  prefetch: () => void;
};

/* A lazily imported module that can be loaded before it is rendered. Rendering only once it has
   loaded avoids Suspense, whose fallback holds a revealed boundary back for 300 ms. */
export const preloadable = <M>(importer: () => Promise<M>): Preloadable<M> => {
  let pending: Promise<M> | null = null;
  let loaded: M | null = null;
  const load = (): Promise<M> => {
    pending ??= importer().then(
      (m) => {
        loaded = m;
        return m;
      },
      (err: unknown) => {
        pending = null;
        throw err;
      },
    );
    return pending;
  };
  return {
    load,
    peek: () => loaded,
    prefetch: () => {
      load().catch(() => undefined);
    },
  };
};
