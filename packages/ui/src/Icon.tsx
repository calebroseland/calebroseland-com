import { Icon as Iconify } from "@iconify/react";
import type { CSSProperties } from "react";
import styles from "./Icon.module.css";
import { type IconName, icons, isIconName } from "./icons.ts";

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

type Props = {
  /** An Iconify name registered in ./icons.ts; content-supplied names fall back to external-link. */
  name: IconName | (string & {});
  size?: IconSize;
  /** Present: the icon is meaningful and announced. Absent: decorative and hidden. No third state. */
  label?: string;
  className?: string | undefined;
};

export function Icon({ name, size = "md", label, className }: Props) {
  const style = { "--size": `var(--icon-${size})` } as CSSProperties;
  const a11y = label
    ? ({ role: "img", "aria-label": label, "aria-hidden": false } as const)
    : ({ "aria-hidden": true, focusable: "false" } as const);
  return (
    <Iconify
      icon={icons[isIconName(name) ? name : "lucide:external-link"]}
      className={className ? `${styles.icon} ${className}` : styles.icon}
      style={style}
      {...a11y}
    />
  );
}
