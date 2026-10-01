import { useHotkey } from "@tanstack/react-hotkeys";
import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

// Open state lives outside any component, so the shortcut and the bar's button share it.
const open = new Store(false);

export const palette = {
  open: () => open.setState(() => true),
  close: () => open.setState(() => false),
  toggle: () => open.setState((o) => !o),
};

export const PALETTE_HOTKEY = "Mod+K";

export function usePaletteOpen(): boolean {
  return useStore(open);
}

/** ⌘K (Ctrl+K elsewhere) opens and closes the palette from anywhere, inputs included. */
export function usePaletteHotkey() {
  useHotkey(PALETTE_HOTKEY, () => palette.toggle(), { ignoreInputs: false });
}
