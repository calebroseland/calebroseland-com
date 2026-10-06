import { useNavigate, useRouterState } from '@tanstack/react-router';
import type { MouseEvent } from 'react';
import { useReduceMotion } from '../hooks/useReduceMotion.ts';
import { withViewTransition } from './viewTransition.ts';

/** The landing card's two sides. */
const CARD = ['/', '/contact'] as const;
const isCard = (href: string) => (CARD as readonly string[]).includes(href.split(/[?#]/)[0] ?? '');

/** Turns the page back into the landing card, on its front or its contact side, morphing unless motion
    is reduced. */
export function useBackToCard() {
  const reduce = useReduceMotion();
  const navigate = useNavigate();
  return (to: (typeof CARD)[number] = '/') =>
    withViewTransition('leave', () => navigate({ to, viewTransition: false }), reduce);
}

/** Goes to an address the way the site's own links do: into or out of the card by its morph (the
    router's page transition would cut it short), anywhere else by the page transition. */
export function useSiteGo() {
  const reduce = useReduceMotion();
  const navigate = useNavigate();
  const onCard = useRouterState({ select: (s) => isCard(s.location.pathname) });
  return (href: string): Promise<void> => {
    const kind = onCard === isCard(href) ? null : onCard ? 'enter' : 'leave';
    if (!kind) {
      return navigate({ href });
    }
    return withViewTransition(kind, () => navigate({ href, viewTransition: false }), reduce);
  };
}

/** A plain click; a modified one (new tab, new window) is left to the browser. */
export const isPlainClick = (e: MouseEvent) =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
