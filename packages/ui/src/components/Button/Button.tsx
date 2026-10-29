import type { ComponentPropsWithRef } from 'react';
import styles from './Button.module.css';

export type ButtonStyle = {
  /** primary: the one main action · secondary: beside it · ghost: quiet · inline: a text action. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'inline' | undefined;
  tone?: 'danger' | undefined;
  /** md (44px) on pages; sm inside dialogs, popovers and other dense surfaces. */
  size?: 'md' | 'sm' | undefined;
};

/** The button's classes, for a link or a Base UI part that should look like one. */
export const button = ({ variant = 'secondary', tone, size = 'md' }: ButtonStyle = {}): string =>
  [styles.button, styles[size], styles[variant], tone === 'danger' && styles.danger]
    .filter(Boolean)
    .join(' ');

type ButtonProps = ButtonStyle &
  ComponentPropsWithRef<'button'> & {
    /** Busy with what it started: disabled, and announced as busy. The label stays the caller's. */
    pending?: boolean;
  };

export const Button = ({
  variant,
  tone,
  size,
  pending = false,
  className,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) => {
  return (
    <button
      // biome-ignore lint/a11y/useButtonType: the type is a prop, "button" unless a form asks otherwise
      type={type}
      className={[button({ variant, tone, size }), className].filter(Boolean).join(' ')}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...rest}
    />
  );
};
