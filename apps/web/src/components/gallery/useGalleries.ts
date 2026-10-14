import { useMemo } from 'react';

/** The galleries in a rendered body. */
export const useGalleries = (body: HTMLElement): HTMLElement[] => {
  return useMemo(() => [...body.querySelectorAll<HTMLElement>('figure.gallery')], [body]);
};
