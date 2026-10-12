import { act, render, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { loading } from '../loading/tracker.ts';
import { useLoaded } from './hooks.ts';
import { preloadable } from './preloadable.ts';

describe('useLoaded', () => {
  it('renders a module already loaded in the first commit', async () => {
    const p = preloadable(async () => ({ value: 'ready' }));
    await p.load();
    const seen: Array<string | null> = [];
    const Probe = () => {
      const m = useLoaded(p, true);
      seen.push(m?.value ?? null);
      return null;
    };
    render(<Probe />);
    expect(seen[0]).toBe('ready');
  });

  it('loads when wanted, counted by the loading bar, then renders it', async () => {
    let resolve = (_: { value: string }) => undefined as void;
    const p = preloadable(() => new Promise<{ value: string }>((r) => (resolve = r)));
    const { result, rerender } = renderHook(({ wanted }) => useLoaded(p, wanted), {
      initialProps: { wanted: false },
    });
    expect(result.current).toBeNull();
    rerender({ wanted: true });
    expect(loading.store.state).toBe(1);
    await act(async () => resolve({ value: 'late' }));
    expect(result.current?.value).toBe('late');
    expect(loading.store.state).toBe(0);
  });

  it('reports a failure once, and tries again when wanted again', async () => {
    const importer = vi
      .fn<() => Promise<{ value: string }>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ value: 'second time' });
    const p = preloadable(importer);
    const onError = vi.fn();
    const { result, rerender } = renderHook(({ wanted }) => useLoaded(p, wanted, onError), {
      initialProps: { wanted: true },
    });
    await waitFor(() => expect(onError).toHaveBeenCalledOnce());
    rerender({ wanted: false });
    rerender({ wanted: true });
    await waitFor(() => expect(result.current?.value).toBe('second time'));
    expect(onError).toHaveBeenCalledOnce();
  });
});
