import type { ReactNode } from 'react';
import styles from './Alert.module.css';

/* A message in the page about the page: something failed (danger, announced at once) or something to
   know (info, announced politely). An inline Button can follow the words. */
export const Alert = ({
  tone = 'danger',
  children,
}: {
  tone?: 'danger' | 'info';
  children: ReactNode;
}) => {
  return (
    <p role={tone === 'danger' ? 'alert' : 'status'} className={`${styles.alert} ${styles[tone]}`}>
      {children}
    </p>
  );
};
