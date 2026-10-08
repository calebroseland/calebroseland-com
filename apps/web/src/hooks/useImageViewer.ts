import { useRouterState } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import { preloadable } from '../lazy/preloadable.ts';

// The viewer, its URL state and its gestures load on first use, or ahead of it when a pointer or focus reaches an image.
const hostChunk = preloadable(() => import('../components/viewer/ViewerHost.tsx'));

type HostModule = Awaited<ReturnType<typeof hostChunk.load>>;

const zoomLink = (e: Event): HTMLAnchorElement | null =>
  e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('a.zoom') : null;

/* The body's images open the viewer. Only this listener is in first load; the rest arrives with the
   viewer, and until then (or if it never does) an image is a link to its file. */
export const useImageViewer = (entryId: string) => {
  const [body, setBody] = useState<HTMLDivElement | null>(null);
  const viewing = useRouterState({
    select: (s) => Boolean((s.location.search as { view?: unknown }).view),
  });
  const [request, setRequest] = useState<HTMLAnchorElement | null>(null);
  const [mod, setMod] = useState<HostModule | null>(hostChunk.peek);

  useEffect(() => {
    if (mod || !(viewing || request)) {
      return;
    }
    let live = true;
    hostChunk.load().then(
      (m) => live && setMod(m),
      () => {
        if (live && request) {
          window.location.assign(request.href);
        }
      },
    );
    return () => {
      live = false;
    };
  }, [mod, viewing, request]);

  useEffect(() => {
    if (!body) {
      return;
    }
    const open = (e: MouseEvent) => {
      const link = zoomLink(e);
      if (
        !link
        || e.defaultPrevented
        || e.button !== 0
        || e.metaKey
        || e.ctrlKey
        || e.shiftKey
        || e.altKey
      ) {
        return;
      }
      e.preventDefault();
      setRequest(link);
    };
    const prefetch = (e: Event) => {
      if (zoomLink(e)) {
        hostChunk.prefetch();
      }
    };
    body.addEventListener('click', open);
    body.addEventListener('pointerover', prefetch);
    body.addEventListener('focusin', prefetch);
    return () => {
      body.removeEventListener('click', open);
      body.removeEventListener('pointerover', prefetch);
      body.removeEventListener('focusin', prefetch);
    };
  }, [body]);

  const handled = useCallback(() => setRequest(null), []);
  const host =
    mod && body
      ? { Host: mod.ViewerHost, props: { body, entryId, request, onRequestHandled: handled } }
      : null;
  return { ref: setBody, host };
};
