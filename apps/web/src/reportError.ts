/* Uncaught client errors, sampled, sent to the Worker. ~30 lines, no vendor, no cookies.
   Never called from tests or E2E because those assert on the console instead. */

const SAMPLE_RATE = 0.1;

const endpoint = (): string => {
  return `${(typeof __API_ORIGIN__ === 'string' && __API_ORIGIN__) || ''}/api/log`;
};

export const reportError = (
  input: { message: string; stack?: string | undefined; kind?: 'error' | 'unhandledrejection' },
  deps: { random?: () => number; send?: (url: string, body: string) => void } = {},
): void => {
  const random = deps.random ?? Math.random;
  if (random() >= SAMPLE_RATE) {
    return;
  }
  const body = JSON.stringify({
    message: input.message.slice(0, 500),
    ...(input.stack ? { stack: input.stack.slice(0, 2000) } : {}),
    url: window.location.href.slice(0, 500),
    userAgent: navigator.userAgent.slice(0, 300),
    kind: input.kind ?? 'error',
  });
  const send =
    deps.send
    ?? ((url: string, payload: string) => {
      // sendBeacon survives a page that is unloading; fetch is the fallback.
      if (navigator.sendBeacon?.(url, new Blob([payload], { type: 'application/json' }))) {
        return;
      }
      void fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => undefined);
    });
  send(endpoint(), body);
};

export const installErrorReporting = (target: Window = window): void => {
  target.addEventListener('error', (event) => {
    reportError({
      message: event.message || 'Unknown error',
      stack: event.error?.stack,
      kind: 'error',
    });
  });
  target.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as { message?: string; stack?: string } | string | undefined;
    reportError({
      message: typeof reason === 'string' ? reason : (reason?.message ?? 'Unhandled rejection'),
      stack: typeof reason === 'object' ? reason?.stack : undefined,
      kind: 'unhandledrejection',
    });
  });
};
