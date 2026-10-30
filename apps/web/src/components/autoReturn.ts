import { dismiss, notify } from '@crc/ui';
import { useEffect, useEffectEvent } from 'react';
import { useBackToCard } from './backToCard.ts';

// WCAG 2.2.1: a warned time limit leaves at least 20 s to extend it.
const TTL_MS = 20_000;

/** A toast countdown to `go`, started once the page is seen; Stay, a click, a key or leaving cancels. */
export const useAutoReturn = (go: () => void) => {
  const arrive = useEffectEvent(go);
  useEffect(() => {
    const listening = new AbortController();
    const { signal } = listening;
    let toast: number | undefined;
    const stay = () => {
      listening.abort();
      if (toast !== undefined) {
        dismiss(toast);
      }
    };
    const start = () => {
      if (document.hidden || toast !== undefined) {
        return;
      }
      toast = notify('Taking you back to the start.', {
        ttl: TTL_MS,
        progress: true,
        onExpire: () => arrive(),
        action: { label: 'Stay', onClick: stay },
      });
      window.addEventListener('pointerdown', stay, { signal });
      window.addEventListener('keydown', stay, { signal });
    };
    document.addEventListener('visibilitychange', start, { signal });
    start();
    return stay;
  }, []);
};

/** The countdown for a missing page, back to the landing card. */
export const useReturnToCard = () => {
  const backToCard = useBackToCard();
  useAutoReturn(() => backToCard());
};
