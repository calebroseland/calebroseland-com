import { describe, expect, it, vi } from 'vitest';
import { preloadable } from './preloadable.ts';

describe('preloadable', () => {
  it('loads once, and peeks the module once loaded', async () => {
    const importer = vi.fn(async () => ({ value: 1 }));
    const p = preloadable(importer);
    expect(p.peek()).toBeNull();
    const [a, b] = await Promise.all([p.load(), p.load()]);
    expect(a).toBe(b);
    expect(p.peek()).toBe(a);
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('retries after a failed load, and a prefetch never throws', async () => {
    const importer = vi
      .fn<() => Promise<{ value: number }>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ value: 2 });
    const p = preloadable(importer);
    p.prefetch();
    await vi.waitFor(() => expect(importer).toHaveBeenCalledTimes(1));
    await expect(p.load()).resolves.toEqual({ value: 2 });
    expect(importer).toHaveBeenCalledTimes(2);
  });
});
