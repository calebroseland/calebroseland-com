/** The browser's local or session storage, or undefined where there is none or reading it throws
    (strict privacy settings); callers then keep their state in memory only. */
export const browserStorage = (kind: 'local' | 'session'): Storage | undefined => {
  try {
    if (typeof window === 'undefined') {
      return undefined;
    }
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return undefined;
  }
};
