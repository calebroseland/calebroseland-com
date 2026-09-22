import styles from "./DropIndicator.module.css";
import type { Edge } from "./reorder.ts";

/** Render inside a `position: relative` row while a drag hovers it. Set `--drop-gap` on the list to
    its gap so the line sits midway between items. */
export function DropIndicator({ edge }: { edge: Edge | null }) {
  if (!edge) return null;
  return <div className={styles.indicator} data-edge={edge} aria-hidden="true" />;
}
