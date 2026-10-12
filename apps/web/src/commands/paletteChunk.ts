import { useEffect } from 'react';
import { preloadable } from '../lazy/preloadable.ts';

/* The palette's dialog and its autocomplete, loaded apart from the site shell, and the moments worth
   loading it ahead of the first ⌘K. Its own module: the dialog imports the palette's state. */
export const paletteChunk = preloadable(() => import('../components/CommandPaletteDialog.tsx'));

/** Pressing ⌘ or Ctrl alone starts loading the palette, a beat before the K. */
export const usePaletteWarmup = () => {
  useEffect(() => {
    const warm = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') {
        paletteChunk.prefetch();
      }
    };
    window.addEventListener('keydown', warm);
    return () => window.removeEventListener('keydown', warm);
  }, []);
};

/** Handlers that start loading the palette when the reader reaches for its button. */
export const usePalettePrefetch = () => {
  return { onPointerEnter: paletteChunk.prefetch, onFocus: paletteChunk.prefetch };
};
