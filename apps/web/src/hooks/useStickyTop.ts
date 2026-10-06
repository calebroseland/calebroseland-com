import { useCallback, useRef } from 'react';

/** Publishes how much of the viewport's top a sticky element covers as `--sticky-top` on <html>, so
    other sticky things (the editor's toolbar) sit below it; 0 while it scrolls away (phones). Its
    height follows the theme's text and spacing scales, hence measured rather than a constant. */
export function useStickyTop<T extends HTMLElement>() {
  const observer = useRef<ResizeObserver | null>(null);
  return useCallback((el: T | null) => {
    observer.current?.disconnect();
    const root = document.documentElement;
    if (!el) {
      root.style.removeProperty('--sticky-top');
      return;
    }
    const publish = () => {
      const sticky = getComputedStyle(el).position === 'sticky';
      root.style.setProperty('--sticky-top', `${sticky ? el.offsetHeight : 0}px`);
    };
    publish();
    if (typeof ResizeObserver === 'undefined') return;
    // A breakpoint that unpins the bar also changes its width, so resizing covers both.
    observer.current = new ResizeObserver(publish);
    observer.current.observe(el);
  }, []);
}
