import { Icon, Tip } from '@crc/ui';
import { formatForDisplay } from '@tanstack/react-hotkeys';
import { PALETTE_HOTKEY, palette } from '../commands/palette.ts';
import { usePalettePrefetch } from '../commands/paletteChunk.ts';
import styles from './SearchButton.module.css';

/** Opens the command palette; its tooltip teaches the shortcut. */
export const SearchButton = () => {
  const keys = formatForDisplay(PALETTE_HOTKEY);
  const prefetch = usePalettePrefetch();
  return (
    <Tip label={`Search and commands (${keys})`} side="bottom">
      <button
        type="button"
        className={styles.button}
        onClick={palette.open}
        onPointerEnter={prefetch.onPointerEnter}
        onFocus={prefetch.onFocus}
        aria-keyshortcuts="Meta+K Control+K"
      >
        <Icon name="lucide:search" size="md" />
        <span className="visually-hidden">Search and commands</span>
      </button>
    </Tip>
  );
};
