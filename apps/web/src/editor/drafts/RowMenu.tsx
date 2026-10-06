import { Menu } from '@base-ui/react/menu';
import { Icon } from '@crc/ui';
import type { ReactNode } from 'react';
import { usePopupMotion } from '../../hooks/usePopupMotion.ts';
import styles from '../editor.module.css';

/* APG menu button via Base UI. Items are passed in so the board and the profile list share the pattern. */
export const RowMenu = ({ label, children }: { label: string; children: ReactNode }) => {
  const motion = usePopupMotion('dropdown');
  return (
    <Menu.Root onOpenChange={motion.onOpenChange}>
      <Menu.Trigger className={styles.handle} aria-label={label}>
        <Icon name="lucide:ellipsis-vertical" size="sm" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={4}>
          <Menu.Popup ref={motion.ref} className={styles.menu}>
            {children}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
};

export const RowMenuItem = ({
  onClick,
  danger,
  disabled,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) => {
  return (
    <Menu.Item
      className={danger ? `${styles.menuItem} ${styles.menuDanger}` : styles.menuItem}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Menu.Item>
  );
};
