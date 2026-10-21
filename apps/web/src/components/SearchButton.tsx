import { Icon, IconButton } from '@crc/ui';
import { formatForDisplay } from '@tanstack/react-hotkeys';
import { PALETTE_HOTKEY, palette } from '../commands/palette.ts';
import { usePalettePrefetch } from '../commands/paletteChunk.ts';

/** Opens the command palette; its tooltip teaches the shortcut. */
export const SearchButton = () => {
  const keys = formatForDisplay(PALETTE_HOTKEY);
  const prefetch = usePalettePrefetch();
  return (
    <IconButton
      label="Search and commands"
      tip={`Search and commands (${keys})`}
      onClick={palette.open}
      onPointerEnter={prefetch.onPointerEnter}
      onFocus={prefetch.onFocus}
      aria-keyshortcuts="Meta+K Control+K"
    >
      <Icon name="lucide:search" size="md" />
    </IconButton>
  );
};
