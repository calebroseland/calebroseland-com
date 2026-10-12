/* Work worth doing before it is needed, done when the browser has nothing better to do: after the
   page has loaded, one task per idle slot. Never for a visitor saving data or on a slow connection. */

type Connection = { saveData?: boolean; effectiveType?: string };

const IDLE_TIMEOUT_MS = 2000;
// Safari has no requestIdleCallback; a short wait after load stands in for it.
const FALLBACK_MS = 1500;

const queue: Array<() => unknown> = [];
let started = false;
let scheduled = false;

const frugal = (): boolean => {
  const c = (navigator as Navigator & { connection?: Connection }).connection;
  return Boolean(c?.saveData) || c?.effectiveType === '2g' || c?.effectiveType === 'slow-2g';
};

const slot = (run: () => void) => {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
  } else {
    setTimeout(run, FALLBACK_MS);
  }
};

const schedule = () => {
  if (!started || scheduled || queue.length === 0) {
    return;
  }
  scheduled = true;
  slot(() => {
    scheduled = false;
    queue.shift()?.();
    schedule();
  });
};

const start = () => {
  started = true;
  schedule();
};

/** Runs `task` in a later idle moment; returns a function that drops it if it has not run yet. */
export const prefetchOnIdle = (task: () => unknown): (() => void) => {
  if (typeof window === 'undefined' || frugal()) {
    return () => undefined;
  }
  queue.push(task);
  if (!started && document.readyState === 'complete') {
    start();
  } else if (!started) {
    window.addEventListener('load', start, { once: true });
  }
  schedule();
  return () => {
    const at = queue.indexOf(task);
    if (at >= 0) {
      queue.splice(at, 1);
    }
  };
};
