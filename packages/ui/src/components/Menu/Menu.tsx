import { Menu as BaseMenu } from '@base-ui/react/menu';
import type { ReactElement, ReactNode } from 'react';
import { Icon } from '../../Icon.tsx';
import { type IconName, isIconName } from '../../icons.ts';
import { usePopupMotion } from '../../motion/usePopupMotion.ts';
import { Tip } from '../Tip/Tip.tsx';
import styles from './Menu.module.css';

/* An APG menu button (Base UI Menu): the trigger, a popup that springs out of it, and rows that
   cascade in. Items are composed from the parts below. */

type MenuProps = {
  /** The trigger element, usually a button styled with iconButton() or button(); it must be named. */
  trigger: ReactElement;
  /** A tooltip for the trigger. */
  tip?: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
};

export const Menu = ({
  trigger,
  tip,
  side = 'bottom',
  align = 'end',
  onOpenChange,
  children,
}: MenuProps) => {
  const motion = usePopupMotion('dropdown');
  const control = <BaseMenu.Trigger render={trigger} />;
  return (
    <BaseMenu.Root
      onOpenChange={(open, details) => {
        motion.onOpenChange(open, details);
        onOpenChange?.(open);
      }}
    >
      {tip ? (
        <Tip label={tip} side="bottom">
          {control}
        </Tip>
      ) : (
        control
      )}
      <BaseMenu.Portal>
        <BaseMenu.Positioner className={styles.positioner} side={side} align={align} sideOffset={6}>
          <BaseMenu.Popup ref={motion.ref} className={styles.menu}>
            {children}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
};

/** A row's leading mark: a registered icon by name, or any element (a colour swatch). */
type Leading = IconName | ReactElement;

const leading = (icon: Leading | undefined) =>
  typeof icon === 'string' && isIconName(icon) ? <Icon name={icon} size="sm" /> : icon;

const check = <Icon name="lucide:check" size="sm" />;

export const MenuItem = ({
  icon,
  tone,
  onClick,
  disabled = false,
  children,
}: {
  icon?: Leading;
  tone?: 'danger';
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) => {
  return (
    <BaseMenu.Item
      className={tone === 'danger' ? `${styles.item} ${styles.danger}` : styles.item}
      onClick={onClick}
      disabled={disabled}
    >
      {leading(icon)}
      <span className={styles.label}>{children}</span>
    </BaseMenu.Item>
  );
};

export const MenuGroup = ({ label, children }: { label?: string; children: ReactNode }) => {
  return (
    <BaseMenu.Group>
      {label && <BaseMenu.GroupLabel className={styles.groupLabel}>{label}</BaseMenu.GroupLabel>}
      {children}
    </BaseMenu.Group>
  );
};

/** One choice among several; choosing closes the menu. */
export const MenuRadioGroup = <T extends string>({
  label,
  value,
  onValueChange,
  children,
}: {
  label?: string;
  value: T;
  onValueChange: (value: T) => void;
  children: ReactNode;
}) => {
  return (
    <BaseMenu.RadioGroup value={value} onValueChange={(v: T) => onValueChange(v)}>
      {label && <BaseMenu.GroupLabel className={styles.groupLabel}>{label}</BaseMenu.GroupLabel>}
      {children}
    </BaseMenu.RadioGroup>
  );
};

export const MenuRadioItem = ({
  value,
  icon,
  children,
}: {
  value: string;
  icon?: Leading;
  children: ReactNode;
}) => {
  return (
    <BaseMenu.RadioItem value={value} className={styles.item} closeOnClick>
      {leading(icon)}
      <span className={styles.label}>{children}</span>
      <BaseMenu.RadioItemIndicator className={styles.indicator}>
        {check}
      </BaseMenu.RadioItemIndicator>
    </BaseMenu.RadioItem>
  );
};

/** A setting that is on or off; the menu stays open so the change can be seen. */
export const MenuCheckboxItem = ({
  checked,
  onCheckedChange,
  icon,
  children,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  icon?: Leading;
  children: ReactNode;
}) => {
  return (
    <BaseMenu.CheckboxItem
      className={styles.item}
      checked={checked}
      onCheckedChange={(next) => onCheckedChange(next)}
    >
      {leading(icon)}
      <span className={styles.label}>{children}</span>
      <BaseMenu.CheckboxItemIndicator className={styles.indicator}>
        {check}
      </BaseMenu.CheckboxItemIndicator>
    </BaseMenu.CheckboxItem>
  );
};

export const MenuSeparator = () => {
  return <BaseMenu.Separator className={styles.separator} />;
};
