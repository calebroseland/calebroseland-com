import { describe, expect, it, vi } from 'vitest';
import { removeLegacyServiceWorker } from './legacyServiceWorker.ts';

const registration = (scriptURL: string) =>
  ({
    active: { scriptURL },
    unregister: vi.fn(async () => true),
  }) as unknown as ServiceWorkerRegistration;

describe('removeLegacyServiceWorker', () => {
  it('unregisters the old worker and leaves any other', async () => {
    const old = registration('https://calebroseland.com/service-worker.js');
    const other = registration('https://calebroseland.com/other-worker.js');
    const removed = await removeLegacyServiceWorker({ getRegistrations: async () => [old, other] });
    expect(removed).toBe(1);
    expect(old.unregister).toHaveBeenCalledOnce();
    expect(other.unregister).not.toHaveBeenCalled();
  });

  it('does nothing without registrations or without service worker support', async () => {
    expect(await removeLegacyServiceWorker({ getRegistrations: async () => [] })).toBe(0);
    expect(await removeLegacyServiceWorker(undefined)).toBe(0);
  });
});
