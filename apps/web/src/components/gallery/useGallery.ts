import { useReduceMotion } from '@crc/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLatest } from '../../hooks/useLatest.ts';
import { useStripFollow } from './useStripFollow.ts';

/** `key` is the slide's place: a gallery's slides never move, and two may show the same file. */
type Slide = { key: string; src: string; alt: string };

// A slide counts as the one on show once most of it is in the track.
const SHOWN = 0.6;

const slidesOf = (figure: HTMLElement) => [
  ...figure.querySelectorAll<HTMLLIElement>('.gallery-track > li'),
];

/** One inline gallery's state: which slide is on show, and moving to another by scrolling its track. */
export const useGallery = (figure: HTMLElement) => {
  const reduce = useReduceMotion();
  const [index, setIndex] = useState(0);
  // Where a button or key last sent the track, until it arrives: presses during the glide count from here.
  const heading = useRef<number | null>(null);
  const lis = slidesOf(figure);
  const slides: Slide[] = lis.map((li, i) => {
    const img = li.querySelector('img');
    return {
      key: `slide-${i}`,
      src: img?.getAttribute('src') ?? '',
      alt: img?.getAttribute('alt') ?? '',
    };
  });

  useEffect(() => {
    const track = figure.querySelector<HTMLElement>('.gallery-track');
    const items = slidesOf(figure);
    if (!track) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const at = items.indexOf(e.target as HTMLLIElement);
            if (at === heading.current) {
              heading.current = null;
            }
            setIndex(at);
          }
        }
      },
      { root: track, threshold: SHOWN },
    );
    for (const li of items) {
      observer.observe(li);
    }
    return () => observer.disconnect();
  }, [figure]);

  const go = useCallback(
    (to: number, focus = false) => {
      const items = slidesOf(figure);
      const at = Math.max(0, Math.min(items.length - 1, to));
      const li = items[at];
      const first = items[0];
      const track = li?.parentElement;
      if (!(li && first && track)) {
        return;
      }
      heading.current = at;
      // An absolute target from layout offsets: boxes read mid-glide can be stale (WebKit).
      track.scrollTo({
        left: li.offsetLeft - first.offsetLeft,
        behavior: reduce ? 'instant' : 'smooth',
      });
      // Focus follows the slide, so it is never left on one scrolled out of view.
      if (focus) {
        li.querySelector<HTMLElement>('a.zoom')?.focus({ preventScroll: true });
      }
    },
    [figure, reduce],
  );

  // Keys are heard on the whole figure, slides included, not only on the controls.
  const latest = useLatest({ index, count: slides.length, go });
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const { index: shown, count, go: move } = latest.current;
      const at = heading.current ?? shown;
      const keys: Record<string, number> = {
        ArrowLeft: at - 1,
        ArrowRight: at + 1,
        Home: 0,
        End: count - 1,
      };
      const to = keys[e.key];
      if (to === undefined || e.altKey || e.ctrlKey || e.metaKey) {
        return;
      }
      e.preventDefault();
      move(to, true);
    };
    figure.addEventListener('keydown', onKeyDown);
    return () => figure.removeEventListener('keydown', onKeyDown);
  }, [figure, latest]);

  const strip = useStripFollow(index);

  return { index, slides, go, strip };
};
