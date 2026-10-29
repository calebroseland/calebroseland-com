import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Tip } from '../Tip/Tip.tsx';
import styles from './IconButton.module.css';

export type IconButtonStyle = {
  /** ghost: on the page · scrim: over an image's dark backdrop. */
  variant?: 'ghost' | 'scrim' | undefined;
  size?: 'md' | 'sm' | undefined;
  shape?: 'square' | 'round' | undefined;
};

/** The icon button's classes, for a link or a Base UI part (a menu or dialog trigger) that should look like one. */
export const iconButton = ({
  variant = 'ghost',
  size = 'md',
  shape = 'square',
}: IconButtonStyle = {}): string =>
  [styles.iconButton, styles[variant], styles[size], styles[shape]].join(' ');

type IconButtonProps = IconButtonStyle &
  Omit<ComponentPropsWithRef<'button'>, 'aria-label' | 'children'> & {
    /** What it does, as its accessible name. An icon button always has one. */
    label: string;
    /** The tooltip: the label unless given; false for none (a toolbar that names its tools elsewhere). */
    tip?: ReactNode | false;
    tipSide?: 'top' | 'bottom' | 'left' | 'right';
    children: ReactNode;
  };

export const IconButton = ({
  label,
  tip = label,
  tipSide = 'bottom',
  variant,
  size,
  shape,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) => {
  const control = (
    <button
      // biome-ignore lint/a11y/useButtonType: the type is a prop, "button" unless a form asks otherwise
      type={type}
      aria-label={label}
      className={[iconButton({ variant, size, shape }), className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
  return tip === false ? (
    control
  ) : (
    <Tip label={tip} side={tipSide}>
      {control}
    </Tip>
  );
};
