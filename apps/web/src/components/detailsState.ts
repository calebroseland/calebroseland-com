import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

// One choice for the card and the footer, which show the same links; held outside both, which remount
// with every page, so it survives navigation.
export const detailsExpanded = new Store(false);

// Mirrored on <html> for transitions that outlive the footer (entering from, and leaving to, the card).
if (typeof document !== "undefined") {
  const mirror = () => {
    document.documentElement.dataset.footer = detailsExpanded.state ? "expanded" : "collapsed";
  };
  mirror();
  detailsExpanded.subscribe(mirror);
}

/** Whether the card and the site footer show every link with its label, and the toggle for it. */
export function useDetailsExpanded() {
  return {
    expanded: useStore(detailsExpanded),
    toggle: () => detailsExpanded.setState((e) => !e),
  };
}
