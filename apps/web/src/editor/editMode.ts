import { notFound } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { Store } from '@tanstack/store';

/* Editing writes the files in content/ through the dev server, so it exists only there. Edit mode is
   off in each new tab, so the dev site looks as a reader sees it until it is switched on, and it
   stays on through a reload (sessionStorage). */

const KEY = 'crc:edit-mode';

type EditModeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | undefined;

export type EditMode = {
  /** Whether this site can edit at all: true only under the dev server. */
  available: boolean;
  store: Store<boolean>;
  set: (on: boolean) => void;
};

export const createEditMode = (env: { available: boolean; storage: EditModeStorage }): EditMode => {
  const read = (): boolean => {
    try {
      return env.available && env.storage?.getItem(KEY) === 'on';
    } catch {
      return false;
    }
  };
  const store = new Store(read());
  return {
    available: env.available,
    store,
    set: (on) => {
      const next = on && env.available;
      store.setState(() => next);
      try {
        if (next) {
          env.storage?.setItem(KEY, 'on');
        } else {
          env.storage?.removeItem(KEY);
        }
      } catch {
        // storage unavailable: edit mode lasts until the tab reloads
      }
    },
  };
};

const safeSessionStorage = (): EditModeStorage => {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
};

export const editMode: EditMode = createEditMode({
  available: import.meta.env.DEV,
  storage: typeof window === 'undefined' ? undefined : safeSessionStorage(),
});

/** Whether edit mode is on, as React sees it. */
export const useEditMode = (): boolean => {
  return useStore(editMode.store);
};

/** Route guard for the editing routes: a built site has none; in dev, opening one turns edit mode on,
    since the address says that is what the visitor wants; a hover preload does not. Kept apart from the editor's render guard,
    so a route's beforeLoad does not pull the editor's data layer onto every page. */
export const requireEditor = ({ preload }: { preload: boolean }): void => {
  if (!editMode.available) {
    throw notFound();
  }
  if (!preload) {
    editMode.set(true);
  }
};
