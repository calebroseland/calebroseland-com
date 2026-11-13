import { useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { isPlainClick } from '../dom.ts';

const internalLink = (e: MouseEvent): HTMLAnchorElement | null => {
  const link = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('a[href]') : null;
  if (
    !link
    || link.origin !== window.location.origin
    || link.target
    || link.hasAttribute('download')
  ) {
    return null;
  }
  // An in-page anchor is left to the browser so it scrolls without a navigation.
  if (
    link.hash
    && link.pathname === window.location.pathname
    && link.search === window.location.search
  ) {
    return null;
  }
  return link;
};

/* A rendered body is HTML from the build, so its links are plain anchors that would reload the
   page; same-origin ones go through the router instead. */
export const useBodyLinks = (body: HTMLElement | null): void => {
  const router = useRouter();
  useEffect(() => {
    if (!body) {
      return;
    }
    const follow = (e: MouseEvent) => {
      if (e.defaultPrevented || !isPlainClick(e)) {
        return;
      }
      const link = internalLink(e);
      if (!link) {
        return;
      }
      e.preventDefault();
      void router.navigate({ href: link.pathname + link.search + link.hash });
    };
    body.addEventListener('click', follow);
    return () => body.removeEventListener('click', follow);
  }, [body, router]);
};
