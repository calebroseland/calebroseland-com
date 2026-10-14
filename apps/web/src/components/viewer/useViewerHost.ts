import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { findSet, formatView, locate, parseView, type ViewTarget } from './sets.ts';
import type { ViewerProps } from './useViewerStage.ts';

export type HostProps = {
  /** The rendered body the images are in. */
  body: HTMLElement;
  /** The entry on show; a new one starts with no history of its own. */
  entryId: string;
  /** A link the reader activated, waiting to be opened. */
  request: HTMLAnchorElement | null;
  onRequestHandled: () => void;
};

const same = (a: ViewTarget | null, b: ViewTarget | null) =>
  a?.set === b?.set && a?.index === b?.index;

/* The open viewer lives in the URL (`?view=g1.2`), so Back closes it, Forward reopens it, and a
   shared link opens on the same image. */
export const useViewerHost = ({ body, entryId, request, onRequestHandled }: HostProps) => {
  const param = useRouterState({
    select: (s) => (s.location.search as { view?: string | undefined }).view,
  });
  const navigate = useNavigate();
  const router = useRouter();
  // Whether an entry without the viewer sits behind this one in history, so closing can go back to it.
  const pushed = useRef(false);
  const entry = useRef(entryId);
  if (entry.current !== entryId) {
    entry.current = entryId;
    pushed.current = false;
  }

  const target = parseView(param);
  // The image on show, kept while the viewer animates closed after the URL has moved on.
  const [shown, setShown] = useState<ViewTarget | null>(null);
  if (target && !same(target, shown)) {
    setShown(target);
  }

  const show = (view: ViewTarget | null, replace: boolean) => {
    void navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        view: view ? formatView(view) : undefined,
      }),
      replace,
      resetScroll: false,
    } as never);
  };
  const showRef = useRef(show);
  showRef.current = show;

  useEffect(() => {
    if (!request) {
      return;
    }
    onRequestHandled();
    const at = locate(body, request);
    if (at) {
      pushed.current = true;
      showRef.current(at, false);
    }
  }, [request, body, onRequestHandled]);

  const set = shown ? findSet(body, shown.set) : null;
  if (!(shown && set?.items[shown.index])) {
    return null;
  }
  const props: ViewerProps = {
    set,
    index: shown.index,
    open: target !== null,
    onIndexChange: (index) => show({ set: set.id, index }, true),
    onCloseRequest: () => {
      if (pushed.current) {
        router.history.back();
      } else {
        show(null, true);
      }
    },
    onClosed: () => setShown(null),
  };
  return props;
};
