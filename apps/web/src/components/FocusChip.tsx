import { Tooltip } from "@base-ui/react/tooltip";
import type { ResolvedTag } from "@crc/content-schema";
import { Icon } from "@crc/ui";
import * as icons from "@crc/ui/icons";
import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";
import styles from "./FocusChip.module.css";

const iconPath = (name: string): string =>
  (icons as Record<string, string>)[name] ?? icons.mdiCodeTags;

/* One focus area on the card. It links to the posts tagged with it unless the profile turns that off,
   and shows its icon, its label, or both. An icon-only chip is a square tile whose label is its
   accessible name and its tooltip. Every chip looks the same at rest; one that links shows a link
   mark on hover or focus, so the difference is found by reaching for it. */
export function FocusChip({ tag }: { tag: ResolvedTag }) {
  const iconOnly = tag.icon !== null && tag.show === "icon";
  const className = [styles.chip, iconOnly && styles.tile].filter(Boolean).join(" ");
  const body = (
    <>
      {tag.icon && <Icon path={iconPath(tag.icon)} size={iconOnly ? "lg" : "sm"} />}
      {!iconOnly && tag.label}
      {tag.link && (
        <span className={styles.linkCue} aria-hidden="true">
          <Icon path={icons.mdiLinkVariant} size="xs" />
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

  if (!iconOnly) return chip;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={chip} />
      <Tooltip.Portal>
        <Tooltip.Positioner className={styles.positioner} sideOffset={6}>
          <Tooltip.Popup className={styles.tooltip}>{tag.label}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
