import styles from "./DropIndicator.module.css";
import type { Edge } from "./reorder.ts";

/** Render inside a `position: relative` row while a drag hovers it. */
export function DropIndicator({ edge }: { edge: Edge | null }) {
  if (!edge) return null;
  return <div className={styles.indicator} data-edge={edge} aria-hidden="true" />;
}
