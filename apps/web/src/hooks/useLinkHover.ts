import { hover } from 'motion';
import { useCallback } from 'react';
import { canAnimate, hoverIcon, hoverUnderline } from '../components/motion/presets.ts';
import { useReduceMotion } from './useReduceMotion.ts';

const styles = { icon: hoverIcon, underline: hoverUnderline };

/** A ref for a link whose `data-hover` parts spring on hover; touch never triggers it. */
export const useLinkHover = (style: keyof typeof styles) => {
  const reduce = useReduceMotion();
  // Stable, so React attaches the listener once per link rather than on every render.
  return useCallback(
    (link: HTMLElement | null) => {
      if (!link || reduce || !canAnimate) {
        return;
      }
      const play = styles[style];
      return hover(link, () => {
        play(link, true);
        return () => {
          play(link, false);
        };
      });
    },
    [reduce, style],
  );
};
