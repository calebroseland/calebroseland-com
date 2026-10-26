import { useStore } from '@tanstack/react-store';
import { readingWidth } from './readingWidth.ts';
import { themeController } from './store.ts';

/** The theme preference, what it resolves to, and the custom themes on this device. */
export const useThemeState = () => {
  return useStore(themeController.store, (s) => s);
};

/** The reader's chosen column width: narrow, standard or wide. */
export const useReadingWidth = () => {
  return useStore(readingWidth.store, (s) => s);
};
