import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

// Outside the footer, which remounts with every page, so the choice holds across navigation.
const expanded = new Store(false);

// Mirrored on <html> for transitions that outlive the footer (entering from, and leaving to, the card).
if (typeof document !== "undefined") {
  const mirror = () => {
    document.documentElement.dataset.footer = expanded.state ? "expanded" : "collapsed";
  };
  mirror();
  expanded.subscribe(mirror);
}

/** Whether the site footer shows its full layout, and the toggle for it. */
export function useFooterExpanded() {
  return { expanded: useStore(expanded), toggle: () => expanded.setState((e) => !e) };
}
