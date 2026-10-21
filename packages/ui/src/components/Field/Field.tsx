import { Field as BaseField } from '@base-ui/react/field';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import styles from './Field.module.css';

/** An input's classes, for a control Field does not wrap (an input inside a composite). */
export const input = ({ size = 'md' }: { size?: 'md' | 'sm' | undefined } = {}): string =>
  `${styles.input} ${styles[size]}`;

type TextFieldProps = Omit<ComponentPropsWithRef<'input'>, 'size' | 'onChange' | 'value'> & {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Help under the field; replaced by `error` while there is one. */
  description?: ReactNode;
  error?: string | null | undefined;
  size?: 'md' | 'sm';
};

/* A labelled text input (Base UI Field): the label, description and error are tied to the input for
   assistive tech, and an error marks it invalid. */
export const TextField = ({
  label,
  value,
  onValueChange,
  description,
  error,
  size = 'md',
  className,
  ...rest
}: TextFieldProps) => {
  return (
    <BaseField.Root className={styles.field} invalid={Boolean(error)}>
      <BaseField.Label className={styles.label}>{label}</BaseField.Label>
      <BaseField.Control
        className={[input({ size }), className].filter(Boolean).join(' ')}
        value={value}
        onValueChange={onValueChange}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {error ? (
        <BaseField.Error className={styles.error} match>
          {error}
        </BaseField.Error>
      ) : (
        description && (
          <BaseField.Description className={styles.description}>
            {description}
          </BaseField.Description>
        )
      )}
    </BaseField.Root>
  );
};
