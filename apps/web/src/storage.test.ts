import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserStorage } from './storage.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('browserStorage', () => {
  it('is undefined without a browser', () => {
    expect(browserStorage('local')).toBeUndefined();
  });

  it('hands over the storage asked for', () => {
    const local = { kind: 'local' };
    const session = { kind: 'session' };
    vi.stubGlobal('window', { localStorage: local, sessionStorage: session });
    expect(browserStorage('local')).toBe(local);
    expect(browserStorage('session')).toBe(session);
  });

  it('is undefined when reading it throws', () => {
    vi.stubGlobal('window', {
      get localStorage(): never {
        throw new Error('SecurityError');
      },
    });
    expect(browserStorage('local')).toBeUndefined();
  });
});
