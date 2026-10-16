type Registrations = Pick<ServiceWorkerContainer, 'getRegistrations'>;

/** Unregisters the old site's service worker if this browser still has it. The site registers none of
    its own, so any worker at that URL is the old one. Resolves to how many it removed. */
export const removeLegacyServiceWorker = async (
  container: Registrations | undefined = globalThis.navigator?.serviceWorker,
): Promise<number> => {
  if (!container) {
    return 0;
  }
  const registrations = await container.getRegistrations();
  const legacy = registrations.filter((r) => {
    const worker = r.active ?? r.waiting ?? r.installing;
    return worker?.scriptURL.endsWith('/service-worker.js') ?? false;
  });
  await Promise.all(legacy.map((r) => r.unregister()));
  return legacy.length;
};
