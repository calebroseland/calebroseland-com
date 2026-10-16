import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { primaryFamily, waitForThemeFonts } from './fontsReady.ts';

describe('primaryFamily', () => {
  it('names the first family of a stack, quoted or not', () => {
    expect(primaryFamily('"IBM Plex Serif", ui-serif, Georgia, serif')).toBe('IBM Plex Serif');
    expect(primaryFamily(" 'proxima-nova', Helvetica")).toBe('proxima-nova');
    expect(primaryFamily('Georgia, serif')).toBe('Georgia');
  });

  it('has nothing to load for a generic family or an empty stack', () => {
    expect(primaryFamily('serif')).toBeNull();
    expect(primaryFamily('ui-sans-serif, system-ui')).toBeNull();
    expect(primaryFamily('')).toBeNull();
  });
});

describe('waitForThemeFonts', () => {
  let load: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    load = vi.fn(() => new Promise(() => undefined));
    vi.stubGlobal('document', {
      documentElement: {},
      fonts: { load, check: () => false },
    });
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (name: string) =>
        ({ '--font-prose': '"IBM Plex Serif", serif', '--font-sans': 'proxima-nova, Helvetica' })[
          name
        ] ?? '',
    }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("loads the theme's text faces, regular, bold and italic", () => {
    void waitForThemeFonts();
    const asked = load.mock.calls.map(([font]) => font);
    expect(asked).toContain('400 1em "IBM Plex Serif"');
    expect(asked).toContain('600 1em "IBM Plex Serif"');
    expect(asked).toContain('italic 400 1em "IBM Plex Serif"');
    expect(asked).toContain('400 1em "proxima-nova"');
  });

  it('gives up after its limit, so a slow or failing font never keeps the page blank', async () => {
    let done = false;
    void waitForThemeFonts().then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(2999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });

  it('resolves as soon as the faces are in', async () => {
    load.mockResolvedValue([]);
    let done = false;
    void waitForThemeFonts().then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(true);
  });

  it('does not wait at all for faces already loaded', async () => {
    vi.stubGlobal('document', { documentElement: {}, fonts: { load, check: () => true } });
    await waitForThemeFonts();
    expect(load).not.toHaveBeenCalled();
  });
});
