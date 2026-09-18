import { Menu } from "@base-ui/react/menu";
import { Icon } from "@crc/ui";
import { mdiDotsVertical } from "@crc/ui/icons";
import type { ReactNode } from "react";
import styles from "../studio.module.css";

/* APG menu button via Base UI. Items are passed in so the board and the profile list share the pattern. */
export function RowMenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Menu.Root>
      <Menu.Trigger className={styles.handle} aria-label={label}>
        <Icon path={mdiDotsVertical} size="sm" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={4}>
          <Menu.Popup className={styles.menu}>{children}</Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export function RowMenuItem({
  onClick,
  danger,
  disabled,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Menu.Item
      className={danger ? `${styles.menuItem} ${styles.menuDanger}` : styles.menuItem}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Menu.Item>
  );
}
