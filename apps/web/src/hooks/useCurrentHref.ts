import { useRouterState } from '@tanstack/react-router';

/** Path, search and hash of the current location, for coming back to it after signing in. */
export const useCurrentHref = (): string => {
  return useRouterState({ select: (s) => s.location.href });
};
