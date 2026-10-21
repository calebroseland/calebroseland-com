import { Fieldset } from '@base-ui/react/fieldset';
import { Radio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import type { CSSProperties } from 'react';
import styles from './RadioGroup.module.css';

/** One choice among a few, laid out as segments under a legend (Base UI RadioGroup in a Fieldset). */
export const RadioGroup = <V extends string>({
  legend,
  value,
  options,
  onValueChange,
  disabled = false,
}: {
  legend: string;
  value: V;
  options: ReadonlyArray<{ value: V; label: string }>;
  onValueChange: (value: V) => void;
  disabled?: boolean;
}) => {
  return (
    <Fieldset.Root
      className={styles.group}
      style={{ '--columns': options.length } as CSSProperties}
      disabled={disabled}
      render={<BaseRadioGroup value={value} onValueChange={(v) => onValueChange(v as V)} />}
    >
      <Fieldset.Legend className={styles.legend}>{legend}</Fieldset.Legend>
      {options.map((o) => (
        // biome-ignore lint/a11y/noLabelWithoutControl: Radio.Root renders the radio inside this label
        <label key={o.value} className={styles.segment}>
          <Radio.Root value={o.value} className={styles.radio}>
            <Radio.Indicator className={styles.dot} />
          </Radio.Root>
          {o.label}
        </label>
      ))}
    </Fieldset.Root>
  );
};
