import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Win = {
  addEventListener: (type: string, fn: () => void, opts?: unknown) => void;
  requestIdleCallback?: (fn: () => void, opts?: unknown) => number;
  cancelIdleCallback?: (id: number) => void;
};

let loaded: () => void;
let idle: Array<() => void>;

const setup = async (opts: { ric?: boolean; connection?: unknown; complete?: boolean } = {}) => {
  vi.resetModules();
  idle = [];
  const win: Win = {
    addEventListener: (type, fn) => {
      if (type === 'load') {
        loaded = fn;
      }
    },
  };
  if (opts.ric !== false) {
    win.requestIdleCallback = (fn) => idle.push(fn);
    win.cancelIdleCallback = () => undefined;
  }
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', { readyState: opts.complete ? 'complete' : 'loading' });
  vi.stubGlobal('navigator', { connection: opts.connection });
  return import('./idle.ts');
};

const runIdle = () => {
  const next = idle.shift();
  next?.();
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('prefetchOnIdle', () => {
  it('waits for the page to load, then runs one task per idle slot, in order', async () => {
    const { prefetchOnIdle } = await setup();
    const ran: string[] = [];
    prefetchOnIdle(() => ran.push('a'));
    prefetchOnIdle(() => ran.push('b'));
    expect(idle).toHaveLength(0);
    loaded();
    runIdle();
    expect(ran).toEqual(['a']);
    runIdle();
    expect(ran).toEqual(['a', 'b']);
  });

  it('starts at once on a page that has already loaded', async () => {
    const { prefetchOnIdle } = await setup({ complete: true });
    const task = vi.fn();
    prefetchOnIdle(task);
    runIdle();
    expect(task).toHaveBeenCalledOnce();
  });

  it('falls back to a timer without requestIdleCallback (Safari)', async () => {
    const { prefetchOnIdle } = await setup({ ric: false, complete: true });
    const task = vi.fn();
    prefetchOnIdle(task);
    vi.advanceTimersByTime(1499);
    expect(task).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(task).toHaveBeenCalledOnce();
  });

  it('queues nothing when the visitor saves data or is on a slow connection', async () => {
    for (const connection of [
      { saveData: true },
      { effectiveType: '2g' },
      { effectiveType: 'slow-2g' },
    ]) {
      const { prefetchOnIdle } = await setup({ complete: true, connection });
      const task = vi.fn();
      prefetchOnIdle(task);
      runIdle();
      vi.runAllTimers();
      expect(task).not.toHaveBeenCalled();
    }
  });

  it('drops a cancelled task', async () => {
    const { prefetchOnIdle } = await setup({ complete: true });
    const task = vi.fn();
    const cancel = prefetchOnIdle(task);
    cancel();
    runIdle();
    expect(task).not.toHaveBeenCalled();
  });
});
