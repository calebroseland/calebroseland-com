import type { ReactNode } from 'react';
import { Page } from '../components/Page.tsx';
import styles from './editor.module.css';

/* Editing screens wear the site's own chrome; only the page's title and its actions differ. Signing in
   and out, and the links into editing, live in the user menu in the site bar. */
export const EditorShell = ({
  children,
  title = 'Editor',
  actions,
}: {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
}) => {
  return (
    <Page>
      <div className={styles.pageHead}>
        <h1 className={styles.title}>{title}</h1>
        {actions && <div className={styles.barGroup}>{actions}</div>}
      </div>
      {children}
    </Page>
  );
};
