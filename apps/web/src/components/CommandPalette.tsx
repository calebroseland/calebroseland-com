import { lazy, Suspense } from 'react';
import { useBuiltinCommands } from '../commands/builtins.ts';
import { useHasBeenTrue } from '../commands/hooks.ts';
import { usePaletteHotkey, usePaletteOpen } from '../commands/palette.ts';

// The dialog and its autocomplete load on first open, so the site shell carries only the shortcut.
const CommandPaletteDialog = lazy(() =>
  import('./CommandPaletteDialog.tsx').then((m) => ({ default: m.CommandPaletteDialog })),
);

/** Mounted once at the root: ⌘K, the site's own commands, and the palette once it has opened. */
export const CommandPalette = () => {
  usePaletteHotkey();
  const open = usePaletteOpen();
  useBuiltinCommands(open);
  const loaded = useHasBeenTrue(open);
  return loaded ? (
    <Suspense fallback={null}>
      <CommandPaletteDialog open={open} />
    </Suspense>
  ) : null;
};
