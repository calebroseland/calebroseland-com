import { Field } from '@base-ui/react/field';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import styles from './Switch.module.css';

/** A setting that is on or off, labelled beside it (Base UI Switch in a Field). */
export const Switch = ({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) => {
  return (
    <Field.Root className={styles.row}>
      <Field.Label className={styles.label}>{label}</Field.Label>
      <BaseSwitch.Root
        className={styles.switch}
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(next)}
      >
        <BaseSwitch.Thumb className={styles.thumb} />
      </BaseSwitch.Root>
    </Field.Root>
  );
};
