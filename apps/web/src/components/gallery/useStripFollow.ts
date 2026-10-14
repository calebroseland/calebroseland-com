import { useEffect, useState } from 'react';
import { useReduceMotion } from '../../hooks/useReduceMotion.ts';

// Room left beside a thumbnail scrolled into view, so its outline shows.
const PAD = 8;

/** A ref for a thumbnail strip that keeps its current thumbnail (`aria-current`) in view, scrolling no further than it must. */
export const useStripFollow = (index: number) => {
  const reduce = useReduceMotion();
  // State, not a ref: a strip that mounts after the index is set (inside a dialog's portal) still follows.
  const [strip, setStrip] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    const v = strip;
    const t = v?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!(v && t) || index < 0) {
      return;
    }
    // Everything fits: nothing to scroll.
    if (v.scrollWidth <= v.clientWidth) {
      return;
    }
    // Where the thumbnail sits in the strip's content: its box less its list's (an overflowing list
    // starts at the content's edge). WebKit reports boxes mid-glide from a stale scroll offset, but
    // both alike, so the difference holds where a box against the viewport would not.
    const list = t.closest('ul') ?? v;
    const box = t.getBoundingClientRect();
    const start = box.left - list.getBoundingClientRect().left;
    const end = start + box.width;
    let target: number | null = null;
    if (start - PAD < v.scrollLeft) {
      target = start - PAD;
    } else if (end + PAD > v.scrollLeft + v.clientWidth) {
      target = end + PAD - v.clientWidth;
    }
    // An absolute target, so a later move replaces an earlier one still gliding instead of adding to it.
    if (target !== null) {
      v.scrollTo({ left: target, behavior: reduce ? 'instant' : 'smooth' });
    }
  }, [strip, index, reduce]);
  return setStrip;
};
