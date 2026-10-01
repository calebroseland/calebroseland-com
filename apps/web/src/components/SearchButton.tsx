import { Icon } from "@crc/ui";
import { formatForDisplay } from "@tanstack/react-hotkeys";
import { PALETTE_HOTKEY, palette } from "../commands/palette.ts";
import styles from "./SearchButton.module.css";
import { Tip } from "./Tip.tsx";

/** Opens the command palette; its tooltip teaches the shortcut. */
export function SearchButton() {
  const keys = formatForDisplay(PALETTE_HOTKEY);
  return (
    <Tip label={`Search and commands (${keys})`} side="bottom">
      <button
        type="button"
        className={styles.button}
        onClick={palette.open}
        aria-keyshortcuts="Meta+K Control+K"
      >
        <Icon name="lucide:search" size="md" />
        <span className="visually-hidden">Search and commands</span>
      </button>
    </Tip>
  );
}
