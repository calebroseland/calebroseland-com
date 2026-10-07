import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react';
import styles from './layout.module.css';
import { type MeasureToken, type SpaceToken, space } from './tokens.ts';

type Common = Omit<HTMLAttributes<HTMLElement>, 'className' | 'children' | 'style'> & {
  as?: ElementType;
  className?: string | undefined;
  children?: ReactNode;
};
type Vars = CSSProperties & Record<`--${string}`, string | number>;

const cx = (...parts: Array<string | undefined>) => parts.filter(Boolean).join(' ');

export const Stack = ({
  as: Tag = 'div',
  gap = '4',
  align,
  className,
  ...rest
}: Common & { gap?: SpaceToken; align?: 'start' | 'center' | 'end' | 'stretch' }) => {
  const style: Vars = { '--gap': space(gap) };
  if (align) {
    style['--align'] = flexAlign(align);
  }
  return <Tag className={cx(styles.stack, className)} style={style} {...rest} />;
};

/** `start`/`end` as flex keywords, so they also apply where `start` would mean the writing direction. */
const flexAlign = (value: string): string =>
  value === 'start' || value === 'end' ? `flex-${value}` : value;

export const Cluster = ({
  as: Tag = 'div',
  gap = '2',
  align,
  justify,
  className,
  ...rest
}: Common & {
  gap?: SpaceToken;
  align?: 'start' | 'center' | 'end' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between';
}) => {
  const style: Vars = { '--gap': space(gap) };
  if (align) {
    style['--align'] = align === 'start' || align === 'end' ? `flex-${align}` : align;
  }
  if (justify) {
    style['--justify'] = justify === 'between' ? 'space-between' : flexAlign(justify);
  }
  return <Tag className={cx(styles.cluster, className)} style={style} {...rest} />;
};

export const Grid = ({
  as: Tag = 'div',
  gap = '6',
  min = '16rem',
  className,
  ...rest
}: Common & { gap?: SpaceToken; min?: `${number}rem` | `${number}ch` }) => {
  const style: Vars = { '--gap': space(gap), '--min': min };
  return <Tag className={cx(styles.grid, className)} style={style} {...rest} />;
};

export const Center = ({
  as: Tag = 'div',
  max = 'measure',
  gutter,
  className,
  ...rest
}: Common & { max?: MeasureToken | `${number}rem`; gutter?: SpaceToken }) => {
  const style: Vars = { '--max': max.endsWith('rem') ? max : `var(--${max})` };
  if (gutter) {
    style['--gutter'] = space(gutter);
  }
  return <Tag className={cx(styles.center, className)} style={style} {...rest} />;
};
