import type { ResolvedTag } from "@crc/content-schema";
import { Icon, isIconName } from "@crc/ui";
import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";
import styles from "./FocusChip.module.css";
import { Tip } from "./Tip.tsx";

const chipIcon = (name: string) => (isIconName(name) ? name : "lucide:code");

/* One focus area on the card. It links to the posts tagged with it unless the profile turns that off,
   and shows its icon, its label, or both. An icon-only chip is a square tile whose label is its
   accessible name and its tooltip. Every chip looks the same at rest; one that links shows a link
   mark on hover or focus, so the difference is found by reaching for it. */
export function FocusChip({ tag }: { tag: ResolvedTag }) {
  const iconOnly = tag.icon !== null && tag.show === "icon";
  const withIcon = tag.icon !== null && tag.show !== "label";
  const className = [styles.chip, iconOnly && styles.tile].filter(Boolean).join(" ");
  const body = (
    <>
      {withIcon && tag.icon && <Icon name={chipIcon(tag.icon)} size={iconOnly ? "lg" : "sm"} />}
      {!iconOnly && tag.label}
      {tag.link && (
        <span className={styles.linkCue} aria-hidden="true">
          <Icon name="lucide:link" size="xs" />
        </span>
      )}
    </>
  );

  const chip: ReactElement = tag.link ? (
    <Link
      to="/posts"
      search={{ tag: tag.label }}
      className={className}
      aria-label={`Posts tagged ${tag.label}`}
    >
      {body}
    </Link>
  ) : iconOnly ? (
    <span className={className} role="img" aria-label={tag.label}>
      {body}
    </span>
  ) : (
    <span className={className}>{body}</span>
  );

  return iconOnly ? <Tip label={tag.label}>{chip}</Tip> : chip;
}
