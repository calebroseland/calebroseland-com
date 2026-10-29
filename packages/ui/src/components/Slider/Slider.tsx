import { Slider as BaseSlider } from '@base-ui/react/slider';
import type { CSSProperties } from 'react';
import { Icon } from '../../Icon.tsx';
import { Tip } from '../Tip/Tip.tsx';
import styles from './Slider.module.css';

/* A labelled range with its value beside the label, and an optional reset to where it started. */

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  /** Where the reset button returns; no reset button without it. */
  initial?: number | undefined;
  /** Paints the track (a hue ramp); the filled part is then left off. */
  trackStyle?: CSSProperties | undefined;
};

/** Rounds to the step's own decimals, so 0.025 steps land on 1.025, not 1.0249999. */
const fixed = (v: number, step: number) =>
  Number(v.toFixed((String(step).split('.')[1] ?? '').length));

export const Slider = ({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  initial,
  trackStyle,
}: SliderProps) => {
  return (
    <BaseSlider.Root
      className={styles.slider}
      value={value}
      min={min}
      max={max}
      step={step}
      onValueChange={(v) => onChange(fixed(v as number, step))}
    >
      <div className={styles.head}>
        <BaseSlider.Label className={styles.label}>{label}</BaseSlider.Label>
        <span className={styles.value}>{format(value)}</span>
        {initial !== undefined && (
          <Tip label={`Reset to ${format(initial)}`}>
            <button
              type="button"
              className={styles.reset}
              aria-label={`Reset ${label.toLowerCase()} to ${format(initial)}`}
              disabled={value === initial}
              onClick={() => onChange(initial)}
            >
              <Icon name="lucide:rotate-ccw" size="sm" />
            </button>
          </Tip>
        )}
      </div>
      <BaseSlider.Control className={styles.control}>
        <BaseSlider.Track className={styles.track} style={trackStyle}>
          {!trackStyle && <BaseSlider.Indicator className={styles.indicator} />}
          <BaseSlider.Thumb className={styles.thumb} getAriaValueText={(_f, v) => format(v)} />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
};
