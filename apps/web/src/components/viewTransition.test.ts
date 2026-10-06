import { afterEach, describe, expect, it, vi } from 'vitest';
import { withViewTransition } from './viewTransition.ts';

function stubDocument() {
  const root = { dataset: {} as DOMStringMap };
  const finishes: Array<() => void> = [];
  vi.stubGlobal('document', {
    documentElement: root,
    startViewTransition(update: () => Promise<void>) {
      const { promise, resolve } = Promise.withResolvers<void>();
      finishes.push(resolve);
      return { finished: promise, updateCallbackDone: update() };
    },
  });
  return { root, finishes };
}

describe('withViewTransition', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('names the transition on <html> until it finishes', async () => {
    const { root, finishes } = stubDocument();
    await withViewTransition('expand', () => {}, false);
    expect(root.dataset.vt).toBe('expand');
    finishes[0]?.();
    await vi.waitFor(() => expect(root.dataset.vt).toBeUndefined());
  });

  it('keeps the name for a transition started over one still running', async () => {
    const { root, finishes } = stubDocument();
    await withViewTransition('expand', () => {}, false);
    await withViewTransition('expand', () => {}, false);
    // The browser skips the first, which finishes it while the second runs.
    finishes[0]?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(root.dataset.vt).toBe('expand');
    finishes[1]?.();
    await vi.waitFor(() => expect(root.dataset.vt).toBeUndefined());
  });
});
