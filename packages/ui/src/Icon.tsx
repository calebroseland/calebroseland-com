import type { CSSProperties } from 'react';
import styles from './Icon.module.css';
import { type IconName, icons, isIconName } from './icons.ts';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type Props = {
  /** An Iconify name registered in ./icons.ts; content-supplied names fall back to external-link. */
  name: IconName | (string & {});
  size?: IconSize;
  /** Present: the icon is meaningful and announced. Absent: decorative and hidden. No third state. */
  label?: string;
  className?: string | undefined;
};

/* Drawn straight from the registered Iconify data (a viewBox and SVG markup), so the site ships the
   icons it uses and not Iconify's runtime. None of the registered icons rotate, flip or offset. */
export const Icon = ({ name, size = 'md', label, className }: Props) => {
  const style = { '--size': `var(--icon-${size})` } as CSSProperties;
  const data = icons[isIconName(name) ? name : 'lucide:external-link'];
  const a11y = label
    ? ({ role: 'img', 'aria-label': label } as const)
    : ({ 'aria-hidden': true, focusable: 'false' } as const);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${data.width ?? 16} ${data.height ?? 16}`}
      className={className ? `${styles.icon} ${className}` : styles.icon}
      style={style}
      {...a11y}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: icon bodies come from the build-time registry (iconData.ts), never from content
      dangerouslySetInnerHTML={{ __html: data.body }}
    />
  );
};
