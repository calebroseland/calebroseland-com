import { useLoadingBar } from '../loading/hooks.ts';
import styles from './LoadingBar.module.css';

/* One thin bar along the top edge while something the reader asked for is still loading. Decorative:
   `<body aria-busy>` carries the state for assistive tech (`<html>` may not hold ARIA attributes). */
export const LoadingBar = () => {
  const bar = useLoadingBar();
  return <div ref={bar.ref} className={styles.bar} data-phase={bar.phase} aria-hidden="true" />;
};
