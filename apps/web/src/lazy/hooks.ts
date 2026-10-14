import { useEffect, useState } from 'react';
import { useLatest } from '../hooks/useLatest.ts';
import { loading } from '../loading/tracker.ts';
import { prefetchOnIdle } from './idle.ts';
import type { Preloadable } from './preloadable.ts';

/* Code-loaded chunks render once loaded, never through React.lazy and Suspense: a Suspense fallback
   holds a revealed boundary back for 300 ms, which made the palette's first open feel slow. */

/** A lazily loaded module once `wanted`: at once if it is already loaded, else after a load the
    loading bar counts. A failed load calls `onError` and is tried again the next time it is wanted. */
export const useLoaded = <M>(
  chunk: Preloadable<M>,
  wanted: boolean,
  onError?: (error: unknown) => void,
): M | null => {
  const [loaded, setLoaded] = useState<M | null>(chunk.peek);
  const report = useLatest(onError);
  useEffect(() => {
    if (!wanted || loaded) {
      return;
    }
    const ready = chunk.peek();
    if (ready) {
      setLoaded(ready);
      return;
    }
    let live = true;
    loading.track(chunk.load()).then(
      (m) => live && setLoaded(m),
      (error: unknown) => live && report.current?.(error),
    );
    return () => {
      live = false;
    };
  }, [chunk, wanted, loaded, report]);
  // Loaded since mount (a prefetch finished): render it in this commit, not after an effect.
  return loaded ?? chunk.peek();
};

/** Prefetches in a later idle moment while `enabled`. */
export const usePrefetchOnIdle = (chunk: Preloadable<unknown>, enabled = true): void => {
  useEffect(() => (enabled ? prefetchOnIdle(chunk.prefetch) : undefined), [chunk, enabled]);
};
