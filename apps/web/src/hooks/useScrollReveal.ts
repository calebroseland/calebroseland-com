import { useReduceMotion } from '@crc/ui';
import { useEffect } from 'react';
import { revealBlocks } from '../components/motion/reveal.ts';

/** A rendered body's blocks fade up as they scroll into view; `entry` names its content, so a new one starts over. */
export const useScrollReveal = (body: HTMLElement | null, entry: string): void => {
  const reduce = useReduceMotion();
  useEffect(() => {
    if (!body || reduce || !entry) {
      return;
    }
    return revealBlocks(body);
  }, [body, entry, reduce]);
};
