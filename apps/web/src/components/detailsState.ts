import { useStore } from '@tanstack/react-store';
import { Store } from '@tanstack/store';
import type { KeyboardEvent } from 'react';

// One choice for the card and the footer, which show the same links; held outside both, which remount
// with every page, so it survives navigation.
export const detailsExpanded = new Store(false);

// Mirrored on <html> for transitions that outlive the footer (entering from, and leaving to, the card).
if (typeof document !== 'undefined') {
  const mirror = () => {
    document.documentElement.dataset.footer = detailsExpanded.state ? 'expanded' : 'collapsed';
  };
  mirror();
  detailsExpanded.subscribe(mirror);
}

/** Whether the card and the site footer show every link with its label, and the toggle for it. */
export const useDetailsExpanded = () => {
  return {
    expanded: useStore(detailsExpanded),
    toggle: () => detailsExpanded.setState((e) => !e),
  };
};

/** For a details toggle's onKeyDown: a held Enter clicks a button on every repeat, where Space waits for
    release; dropping the repeats makes either key one toggle per press. */
export const oncePerPress = (event: KeyboardEvent): void => {
  if (event.key === 'Enter' && event.repeat) {
    event.preventDefault();
  }
};
