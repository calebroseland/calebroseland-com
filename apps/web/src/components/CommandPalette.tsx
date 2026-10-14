import { useBuiltinCommands } from '../commands/builtins.ts';
import { useHasBeenTrue } from '../commands/hooks.ts';
import { palette, usePaletteHotkey, usePaletteOpen } from '../commands/palette.ts';
import { paletteChunk, usePaletteWarmup } from '../commands/paletteChunk.ts';
import { notifyLoadFailed } from '../lazy/failed.ts';
import { useLoaded, usePrefetchOnIdle } from '../lazy/hooks.ts';

const failed = () => {
  notifyLoadFailed('search');
  palette.close();
};

/** The palette's dialog once it has loaded; loaded ahead on idle, so the first ⌘K opens at once. */
const usePaletteDialog = (open: boolean) => {
  usePrefetchOnIdle(paletteChunk);
  usePaletteWarmup();
  const mod = useLoaded(paletteChunk, open, failed);
  // Kept mounted after the first open, so it can animate out.
  const opened = useHasBeenTrue(open);
  return opened ? mod?.CommandPaletteDialog : undefined;
};

/** Mounted once at the root: ⌘K, the site's own commands, and the palette once it has opened. */
export const CommandPalette = () => {
  usePaletteHotkey();
  const open = usePaletteOpen();
  useBuiltinCommands(open);
  const Dialog = usePaletteDialog(open);
  return Dialog ? <Dialog open={open} /> : null;
};
