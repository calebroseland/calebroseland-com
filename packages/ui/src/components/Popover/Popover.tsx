import { Popover as BasePopover } from '@base-ui/react/popover';
import type { ReactElement, ReactNode } from 'react';
import { usePopupMotion } from '../../motion/usePopupMotion.ts';
import styles from './Popover.module.css';

/** A small titled panel of settings, opened from a trigger (Base UI Popover). */
export const Popover = ({
  trigger,
  title,
  side = 'bottom',
  align = 'end',
  children,
}: {
  /** The trigger element; it must be named. */
  trigger: ReactElement;
  title: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  children: ReactNode;
}) => {
  const motion = usePopupMotion('dropdown');
  return (
    <BasePopover.Root onOpenChange={motion.onOpenChange}>
      <BasePopover.Trigger render={trigger} />
      <BasePopover.Portal>
        <BasePopover.Positioner
          className={styles.positioner}
          side={side}
          align={align}
          sideOffset={6}
        >
          <BasePopover.Popup ref={motion.ref} className={styles.popup}>
            <BasePopover.Title className={styles.title}>{title}</BasePopover.Title>
            {children}
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
};
