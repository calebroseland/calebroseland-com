import { recognize, type Size } from '@crc/interaction/gestures';
import { cancelFrame, frame } from 'motion';
import { useMotionValue, useTransform } from 'motion/react';
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLatest } from '../../hooks/useLatest.ts';
import { useReduceMotion } from '../../hooks/useReduceMotion.ts';
import { useStripFollow } from '../gallery/useStripFollow.ts';
import { revealNow } from '../motion/reveal.ts';
import type { ViewerItem, ViewerSet } from './sets.ts';
import { createStage, type StageValues } from './stage.ts';

export type ViewerProps = {
  set: ViewerSet;
  index: number;
  /** False once the viewer should leave; it animates out, then calls `onClosed`. */
  open: boolean;
  onIndexChange: (index: number) => void;
  /** The reader asked to close (Esc, the close button, a swipe); the owner drops the URL state. */
  onCloseRequest: () => void;
  onClosed: () => void;
};

const EDGE = 24;
const IDLE_MS = 3000;
const ANNOUNCE_ZOOM_MS = 500;

const sourceImage = (item: ViewerItem | undefined) => item?.source.querySelector('img') ?? null;

/** Where the page shows the image: its box less any letterboxing from `object-fit: contain`. */
const sourceRect = (item: ViewerItem | undefined): DOMRect | null => {
  const img = sourceImage(item);
  if (!img || !item) {
    return null;
  }
  const box = img.getBoundingClientRect();
  const n = naturalSize(item);
  const s = Math.min(box.width / n.width, box.height / n.height);
  const w = n.width * s;
  const h = n.height * s;
  return new DOMRect(box.left + (box.width - w) / 2, box.top + (box.height - h) / 2, w, h);
};

/** The image's own size: from its attributes, else as loaded, else as shown on the page. */
const naturalSize = (item: ViewerItem): Size => {
  if (item.width && item.height) {
    return { width: item.width, height: item.height };
  }
  const img = sourceImage(item);
  if (img?.naturalWidth) {
    return { width: img.naturalWidth, height: img.naturalHeight };
  }
  const r = img?.getBoundingClientRect();
  return { width: r?.width || 1, height: r?.height || 1 };
};

/** A gallery's track scrolls (instantly) to the slide the viewer ended on, so closing lands on it. */
const revealInTrack = (link: HTMLElement) => {
  const slide = link.closest('li');
  const track = slide?.closest<HTMLElement>('.gallery-track');
  if (slide && track) {
    track.scrollLeft += slide.getBoundingClientRect().left - track.getBoundingClientRect().left;
  }
};

/** The figure, or the whole gallery, an image sits in: what the viewer stands in for while open. */
const blockOf = (link: HTMLElement): HTMLElement =>
  link.closest<HTMLElement>('figure.gallery') ?? link.closest<HTMLElement>('figure') ?? link;

const isCoarse = () => typeof matchMedia === 'function' && matchMedia('(hover: none)').matches;

/** Everything the viewer component renders from: Motion values, the gesture-driven stage, and its commands. */
export const useViewerStage = (props: ViewerProps) => {
  const { set, index, open } = props;
  const reduce = useReduceMotion();
  const [touch, setTouch] = useState(isCoarse);
  const latest = useLatest({ props, reduce, touch });
  const item = set.items[index];
  const count = set.items.length;

  const values: StageValues = {
    x: useMotionValue(0),
    y: useMotionValue(0),
    scale: useMotionValue(1),
    strip: useMotionValue(0),
    backdrop: useMotionValue(1),
    fade: useMotionValue(1),
  };
  const valuesRef = useRef(values);

  const [shown, setShown] = useState(true);
  const [box, setBox] = useState<Size | null>(null);
  const [controls, setControls] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [announcement, setAnnouncement] = useState('');
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const stageEl = useRef<HTMLDivElement | null>(null);
  const popup = useRef<HTMLDivElement | null>(null);
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const zoomNote = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const step = useCallback(
    (dir: 'next' | 'previous') => {
      const { props: p } = latest.current;
      const to = p.index + (dir === 'next' ? 1 : -1);
      if (to >= 0 && to < p.set.items.length) {
        p.onIndexChange(to);
      }
    },
    [latest],
  );

  const wake = useCallback((pointerType?: string) => {
    if (pointerType) {
      setTouch(pointerType !== 'mouse');
    }
    setControls(true);
    clearTimeout(idle.current);
    if (pointerType !== 'mouse' && (pointerType || isCoarse())) {
      idle.current = setTimeout(() => setControls(false), IDLE_MS);
    }
  }, []);

  const stage = useMemo(
    () =>
      createStage({
        values: valuesRef.current,
        rect: () =>
          stageEl.current?.getBoundingClientRect() ?? new DOMRect(0, 0, innerWidth, innerHeight),
        item: () => {
          const { props: p } = latest.current;
          const it = p.set.items[p.index];
          return {
            natural: it ? naturalSize(it) : { width: 1, height: 1 },
            vector: it?.vector ?? false,
          };
        },
        can: (dir) => {
          const { props: p } = latest.current;
          const to = p.index + (dir === 'next' ? 1 : -1);
          return to >= 0 && to < p.set.items.length;
        },
        step,
        close: () => latest.current.props.onCloseRequest(),
        toggleControls: () => {
          clearTimeout(idle.current);
          setControls((c) => !c);
        },
        input: (pointerType) => {
          setTouch(pointerType !== 'mouse');
          if (pointerType === 'mouse') {
            setControls(true);
          }
        },
        settled: (scale) => {
          setZoom(scale);
          if (scale > 1.01) {
            setControls((c) => (latest.current.touch ? false : c));
          }
          clearTimeout(zoomNote.current);
          zoomNote.current = setTimeout(
            () => setAnnouncement(`Zoom ${Math.round(scale * 100)}%`),
            ANNOUNCE_ZOOM_MS,
          );
        },
        reduce: () => latest.current.reduce,
      }),
    [latest, step],
  );

  useEffect(() => () => stage.dispose(), [stage]);
  useEffect(() => () => clearTimeout(idle.current), []);
  useEffect(() => () => clearTimeout(zoomNote.current), []);

  // While the viewer shows an image, its place on the page is empty, so it is never seen twice.
  const hidden = useRef<HTMLElement | null>(null);
  const hide = useCallback((el: HTMLElement | null) => {
    if (hidden.current && hidden.current !== el) {
      delete hidden.current.dataset.viewing;
    }
    hidden.current = el;
    if (el) {
      el.dataset.viewing = '';
    }
  }, []);

  // Attaching the stage is the moment to measure: the image grows out of its place on the page.
  const attachStage = useCallback(
    (el: HTMLDivElement | null) => {
      stageEl.current = el;
      if (!el) {
        return;
      }
      let measured = { width: el.clientWidth, height: el.clientHeight };
      setBox(measured);
      // The observer also reports the size it starts with; only a real change (a turned phone) resets.
      const observer = new ResizeObserver(() => {
        const next = { width: el.clientWidth, height: el.clientHeight };
        if (next.width === measured.width && next.height === measured.height) {
          return;
        }
        measured = next;
        setBox(next);
        stage.reset();
      });
      observer.observe(el);
      const it = latest.current.props.set.items[latest.current.props.index];
      // The page's image must be in place to grow from, not waiting to fade up.
      if (it) {
        revealNow(it.source);
      }
      stage.open(sourceRect(it));
      hide(it ? blockOf(it.source) : null);
      wake();
      const stop = recognize(el, stage.handlers, { edge: EDGE });
      return () => {
        hide(null);
        observer.disconnect();
        stop();
      };
    },
    [stage, latest, wake, hide],
  );

  // A new image starts at rest; the counter and alt are announced.
  const shownIndex = useRef(index);
  useLayoutEffect(() => {
    if (shownIndex.current === index) {
      return;
    }
    shownIndex.current = index;
    stage.rest();
    setZoom(1);
    const it = latest.current.props.set.items[index];
    setAnnouncement(`Image ${index + 1} of ${count}${it?.alt ? `: ${it.alt}` : ''}`);
  }, [index, count, stage, latest]);

  // Leaving: back into the page's image (its gallery moved to it first), then the dialog closes.
  const leaving = useRef(false);
  useEffect(() => {
    if (open || leaving.current) {
      return;
    }
    leaving.current = true;
    const it = latest.current.props.set.items[latest.current.props.index];
    if (it) {
      revealNow(it.source);
      revealInTrack(it.source);
    }
    void stage.close(sourceRect(it)).then(() => {
      // Landed: the page's own image takes over before focus returns to its link.
      hide(null);
      setShown(false);
    });
  }, [open, stage, latest, hide]);

  const fit = box && item ? stage.fit() : null;
  // The image's box and transform are written here, from all three values at once, once per frame.
  // Bound as separate Motion styles, some of them run as accelerated Web Animations and the rest
  // inline, and the two disagree about the transform: the image jumped when a zoom settled.
  const image = useRef<HTMLImageElement | null>(null);
  const fitWidth = fit?.width ?? 0;
  const fitHeight = fit?.height ?? 0;
  const src = item?.src;
  // A layout effect, so a new image (or a new fit) is placed before the browser draws it.
  useLayoutEffect(() => {
    const v = valuesRef.current;
    const paint = () => {
      const el = image.current;
      if (!el) {
        return;
      }
      // Until the stage is measured there is nowhere to put it: hidden, not drawn at natural size.
      el.style.visibility = src && fitWidth ? '' : 'hidden';
      el.style.width = `${fitWidth}px`;
      el.style.height = `${fitHeight}px`;
      el.style.transform = `translate(${v.x.get()}px, ${v.y.get()}px) translate(-50%, -50%) scale(${v.scale.get()})`;
    };
    paint();
    const offs = [v.x, v.y, v.scale].map((value) => value.on('change', () => frame.render(paint)));
    return () => {
      for (const off of offs) {
        off();
      }
      cancelFrame(paint);
    };
  }, [fitWidth, fitHeight, src]);
  const scrimOpacity = useTransform(() => values.backdrop.get() * values.fade.get());

  const onKeyDown = (e: KeyboardEvent) => {
    wake();
    const zoomed = stage.zoomed();
    const keys: Record<string, () => void> = {
      ArrowLeft: () => (zoomed ? stage.nudge(-1, 0) : step('previous')),
      ArrowRight: () => (zoomed ? stage.nudge(1, 0) : step('next')),
      ArrowUp: () => zoomed && stage.nudge(0, -1),
      ArrowDown: () => zoomed && stage.nudge(0, 1),
      '+': () => stage.zoomBy(stage.keyZoom),
      '=': () => stage.zoomBy(stage.keyZoom),
      '-': () => stage.zoomBy(1 / stage.keyZoom),
      '0': () => stage.reset(),
      Home: () => props.onIndexChange(0),
      End: () => props.onIndexChange(count - 1),
    };
    const run = e.ctrlKey || e.metaKey || e.altKey ? undefined : keys[e.key];
    if (run) {
      e.preventDefault();
      run();
    }
  };

  const thumbs = useStripFollow(index);

  const neighbour = (offset: number) => {
    const it = set.items[index + offset];
    if (!it || !box) {
      return null;
    }
    const n = naturalSize(it);
    const s = Math.min(
      (box.width - 32) / n.width,
      (box.height - 32) / n.height,
      it.vector ? 99 : 1,
    );
    return { item: it, offset, width: n.width * s, height: n.height * s };
  };

  return {
    item,
    count,
    index,
    shown,
    values,
    image,
    scrimOpacity,
    neighbours: [neighbour(-1), neighbour(1)].filter((n) => n !== null),
    controls,
    touch,
    zoom,
    announcement,
    failed: item ? failed.has(item.src) : false,
    attachStage,
    thumbs,
    popup,
    onKeyDown,
    onFocusWithin: () => wake(),
    onImageError: (failedSrc: string) => setFailed((f) => new Set(f).add(failedSrc)),
    previous: () => step('previous'),
    next: () => step('next'),
    zoomIn: () => stage.zoomBy(stage.keyZoom),
    zoomOut: () => stage.zoomBy(1 / stage.keyZoom),
    close: () => props.onCloseRequest(),
    dialog: {
      onOpenChange: (next: boolean) => {
        if (!next) {
          props.onCloseRequest();
        }
      },
      onOpenChangeComplete: (next: boolean) => {
        if (!next) {
          props.onClosed();
        }
      },
      finalFocus: () => latest.current.props.set.items[latest.current.props.index]?.source ?? true,
    },
  };
};
