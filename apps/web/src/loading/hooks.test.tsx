import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBarPhase } from './hooks.ts';
import { loading } from './tracker.ts';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  document.documentElement.removeAttribute('aria-busy');
});

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('useBarPhase', () => {
  it('stays hidden for a load under 300 ms', () => {
    const { result } = renderHook(() => useBarPhase());
    let end = () => undefined as void;
    act(() => {
      end = loading.begin();
    });
    advance(299);
    expect(result.current).toBe('waiting');
    act(() => end());
    expect(result.current).toBe('hidden');
    advance(1000);
    expect(result.current).toBe('hidden');
    expect(document.documentElement.hasAttribute('aria-busy')).toBe(false);
  });

  it('runs from 300 ms, and once shown stays at least 400 ms before finishing', () => {
    const { result } = renderHook(() => useBarPhase());
    let end = () => undefined as void;
    act(() => {
      end = loading.begin();
    });
    advance(300);
    expect(result.current).toBe('running');
    expect(document.documentElement.getAttribute('aria-busy')).toBe('true');
    advance(50);
    act(() => end());
    expect(result.current).toBe('running');
    advance(350);
    expect(result.current).toBe('finishing');
    expect(document.documentElement.getAttribute('aria-busy')).toBe('true');
    advance(400);
    expect(result.current).toBe('hidden');
    expect(document.documentElement.hasAttribute('aria-busy')).toBe(false);
  });

  it('goes back to running when a new load starts while finishing', () => {
    const { result } = renderHook(() => useBarPhase());
    let end = () => undefined as void;
    act(() => {
      end = loading.begin();
    });
    advance(800);
    act(() => end());
    advance(0);
    expect(result.current).toBe('finishing');
    act(() => {
      end = loading.begin();
    });
    expect(result.current).toBe('running');
    act(() => end());
    advance(1000);
    expect(result.current).toBe('hidden');
  });

  it('keeps running when a new load starts before the old one could finish', () => {
    const { result } = renderHook(() => useBarPhase());
    let end = () => undefined as void;
    act(() => {
      end = loading.begin();
    });
    advance(320);
    act(() => end());
    act(() => {
      end = loading.begin();
    });
    advance(1000);
    expect(result.current).toBe('running');
    act(() => end());
  });
});
