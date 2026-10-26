import { Store } from '@tanstack/store';
import { browserStorage } from '../storage.ts';

/* How wide the reader wants the reading column: narrow, as designed, or wide. `--reading-width` on
   <html> carries the choice to the column and its prose; theme-init.js sets it before first paint
   from the same key. Standard sets nothing, so posts and pages keep their designed measures. */

const READING_WIDTHS = ['narrow', 'standard', 'wide'] as const;
export type ReadingWidth = (typeof READING_WIDTHS)[number];

// theme-init.js repeats these two; change them together.
const WIDTH: Record<ReadingWidth, string | null> = {
  narrow: '60ch',
  standard: null,
  wide: '120ch',
};

const KEY = 'reading-width';
const VAR = '--reading-width';

type Env = {
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  root?: { style: Pick<CSSStyleDeclaration, 'setProperty' | 'removeProperty'> };
};

const read = (storage: Env['storage']): ReadingWidth => {
  try {
    const v = storage?.getItem(KEY);
    return READING_WIDTHS.find((w) => w === v) ?? 'standard';
  } catch {
    return 'standard';
  }
};

const write = (storage: Env['storage'], value: ReadingWidth) => {
  try {
    if (value === 'standard') {
      storage?.removeItem(KEY);
    } else {
      storage?.setItem(KEY, value);
    }
  } catch {
    // storage unavailable (private mode); the width lives for the session only
  }
};

export type ReadingWidthController = {
  store: Store<ReadingWidth>;
  set(value: ReadingWidth): void;
};

export const createReadingWidthStore = (env: Env): ReadingWidthController => {
  const store = new Store<ReadingWidth>(read(env.storage));
  const paint = (value: ReadingWidth) => {
    const css = WIDTH[value];
    if (css === null) {
      env.root?.style.removeProperty(VAR);
    } else {
      env.root?.style.setProperty(VAR, css);
    }
  };
  paint(store.state);
  return {
    store,
    set: (value) => {
      store.setState(() => value);
      write(env.storage, value);
      paint(value);
    },
  };
};

const browserEnv = (): Env => {
  if (typeof document === 'undefined') {
    return {};
  }
  const storage = browserStorage('local');
  return storage ? { root: document.documentElement, storage } : { root: document.documentElement };
};

export const readingWidth: ReadingWidthController = createReadingWidthStore(browserEnv());
