import type { CSSProperties } from "react";
import styles from "./Icon.module.css";

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

type Props = {
  /** An @mdi/js path string re-exported from ./icons.ts */
  path: string;
  size?: IconSize;
  /** Present: the icon is meaningful and announced. Absent: decorative and hidden. No third state. */
  label?: string;
  className?: string | undefined;
};

export function Icon({ path, size = "md", label, className }: Props) {
  const style = { "--size": `var(--icon-${size})` } as CSSProperties;
  const a11y = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true, focusable: "false" } as const);
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ? `${styles.icon} ${className}` : styles.icon}
      style={style}
      {...a11y}
    >
      <path d={path} />
    </svg>
  );
}
