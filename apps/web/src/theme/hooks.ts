import { useStore } from "@tanstack/react-store";
import { themeController } from "./store.ts";

/** The theme preference, what it resolves to, and the custom themes on this device. */
export function useThemeState() {
  return useStore(themeController.store, (s) => s);
}
