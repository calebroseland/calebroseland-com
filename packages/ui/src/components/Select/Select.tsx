import { Field } from '@base-ui/react/field';
import { Select as BaseSelect } from '@base-ui/react/select';
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '../../Icon.tsx';
import { usePopupMotion } from '../../motion/usePopupMotion.ts';
import styles from './Select.module.css';

export type SelectOption<V extends string> = {
  value: V;
  label: string;
  /** Shown before the label in the list (an icon). */
  leading?: ReactNode;
  /** Applied to the label in the list (a font sample). */
  style?: CSSProperties;
};

/** A visible label above the trigger, or a hidden one naming a trigger that shows its value only. */
type Naming = { label: string; hiddenLabel?: never } | { hiddenLabel: string; label?: never };

type SelectProps<V extends string> = Naming & {
  value: V;
  options: ReadonlyArray<SelectOption<V>>;
  onValueChange: (value: V) => void;
  /** How the trigger shows the value; the option's label by default. */
  renderValue?: (value: V) => ReactNode;
  /** A trigger with its own look (an icon on the card) instead of the bordered field. */
  triggerClassName?: string | undefined;
};

/** One value from a list (Base UI Select). */
export const Select = <V extends string>({
  value,
  options,
  onValueChange,
  label,
  hiddenLabel,
  renderValue,
  triggerClassName,
}: SelectProps<V>) => {
  const motion = usePopupMotion('dropdown');
  const select = (
    <BaseSelect.Root
      onOpenChange={motion.onOpenChange}
      value={value}
      items={options.map((o) => ({ value: o.value, label: o.label }))}
      onValueChange={(v) => v && onValueChange(v as V)}
    >
      {label && <BaseSelect.Label className={styles.label}>{label}</BaseSelect.Label>}
      <BaseSelect.Trigger className={triggerClassName ?? styles.trigger} aria-label={hiddenLabel}>
        <BaseSelect.Value>{renderValue ? (v: V) => renderValue(v) : undefined}</BaseSelect.Value>
        {!triggerClassName && (
          <BaseSelect.Icon className={styles.chevron}>
            <Icon name="lucide:chevron-down" size="sm" />
          </BaseSelect.Icon>
        )}
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner
          className={styles.positioner}
          sideOffset={4}
          alignItemWithTrigger={false}
        >
          <BaseSelect.Popup ref={motion.ref} className={styles.popup}>
            <BaseSelect.List>
              {options.map((o) => (
                <BaseSelect.Item key={o.value} value={o.value} className={styles.item}>
                  {o.leading}
                  <BaseSelect.ItemText style={o.style}>{o.label}</BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator className={styles.check}>
                    <Icon name="lucide:check" size="sm" />
                  </BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
  return label ? <Field.Root className={styles.field}>{select}</Field.Root> : select;
};
