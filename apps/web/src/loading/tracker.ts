import { Store } from '@tanstack/store';

/* Every load the reader waits on, counted in one place, so one bar can say "still working" for all of
   them: navigations, lazily loaded surfaces, and data an editor needs before it can show. */

const pending = new Store(0);

/** Counts one load until the returned function is called (once; later calls do nothing). */
const begin = (): (() => void) => {
  pending.setState((n) => n + 1);
  let ended = false;
  return () => {
    if (!ended) {
      ended = true;
      pending.setState((n) => Math.max(0, n - 1));
    }
  };
};

export const loading = {
  begin,
  /** Counts `work` until it settles, resolved or rejected, and hands it back unchanged. */
  track: <T>(work: Promise<T>): Promise<T> => {
    const end = begin();
    work.then(end, end);
    return work;
  },
  store: pending,
};
