import { useRouterState } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import { preloadable } from '../../lazy/preloadable.ts';

/* The viewer and the gallery controls load together: at once for a body with a gallery, else on
   first use or ahead of it when a pointer or focus reaches an image. */
const mediaChunk = preloadable(() => import('./BodyMedia.tsx'));

type MediaModule = Awaited<ReturnType<typeof mediaChunk.load>>;

const zoomLink = (e: Event): HTMLAnchorElement | null =>
  e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('a.zoom') : null;

/* A rendered body's images. Only this listener is in first load; until the rest arrives (or if it
   never does) an image is a link to its file and a gallery a row that scrolls and snaps. */
export const useBodyMedia = (entryId: string) => {
  const [body, setBody] = useState<HTMLDivElement | null>(null);
  const viewing = useRouterState({
    select: (s) => Boolean((s.location.search as { view?: unknown }).view),
  });
  const [request, setRequest] = useState<HTMLAnchorElement | null>(null);
  const [mod, setMod] = useState<MediaModule | null>(mediaChunk.peek);
  // Read from the DOM once the entry's HTML is in it.
  const [gallery, setGallery] = useState<string | null>(null);
  useEffect(() => {
    setGallery(body?.querySelector('figure.gallery') ? entryId : null);
  }, [body, entryId]);

  useEffect(() => {
    if (mod || !(viewing || request || gallery)) {
      return;
    }
    let live = true;
    mediaChunk.load().then(
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
  }, [mod, viewing, request, gallery]);

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
        mediaChunk.prefetch();
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
  const media =
    mod && body
      ? {
          Media: mod.BodyMedia,
          props: {
            body,
            entryId,
            request,
            onRequestHandled: handled,
            galleries: gallery === entryId,
          },
        }
      : null;
  return { ref: setBody, body, media };
};
