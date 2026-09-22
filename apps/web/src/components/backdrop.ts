import type { MouseEvent } from "react";

/** Marks an element whose empty area counts as the page's background. */
export const backdrop = { "data-backdrop": "" } as const;

/* True for a plain primary click that landed on a marked background itself, not on anything inside it,
   and that did not finish a text selection. The background is a pointer shortcut only: every toggle it
   offers also has a focusable control. */
export function isBackdropClick(e: MouseEvent): boolean {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  if (!(e.target instanceof Element) || !e.target.hasAttribute("data-backdrop")) return false;
  return window.getSelection()?.isCollapsed ?? true;
}
