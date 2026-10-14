import { describe, expect, it } from 'vitest';
import { loading } from './tracker.ts';

describe('loading tracker', () => {
  it('counts a promise until it settles, rejected ones too', async () => {
    const ok = loading.track(Promise.resolve(1));
    const failed = loading.track(Promise.reject(new Error('offline')));
    expect(loading.store.state).toBe(2);
    await ok;
    await failed.catch(() => undefined);
    await Promise.resolve();
    expect(loading.store.state).toBe(0);
  });

  it('pairs begin with its end, once, and nests', () => {
    const a = loading.begin();
    const b = loading.begin();
    expect(loading.store.state).toBe(2);
    a();
    a();
    expect(loading.store.state).toBe(1);
    b();
    expect(loading.store.state).toBe(0);
  });
});
