import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import type { ReactNode } from 'react';
import styles from './Tabs.module.css';

/** The tab row's and a tab's classes, for links that switch views by address (a filter nav). */
export const tabList = (): string => styles.list ?? '';
export const tab = (): string => styles.tab ?? '';

/* APG tabs (Base UI Tabs): one tab stop, arrow keys move and select, each panel named by its tab.
   Only the selected panel is mounted. */
export const Tabs = <V extends string>({
  label,
  value,
  onValueChange,
  tabs,
}: {
  label: string;
  value: V;
  onValueChange: (value: V) => void;
  tabs: ReadonlyArray<{ value: V; label: ReactNode; panel: ReactNode }>;
}) => {
  return (
    <BaseTabs.Root value={value} onValueChange={(v) => onValueChange(v as V)}>
      <BaseTabs.List className={styles.list} aria-label={label} activateOnFocus>
        {tabs.map((t) => (
          <BaseTabs.Tab key={t.value} value={t.value} className={styles.tab}>
            {t.label}
          </BaseTabs.Tab>
        ))}
      </BaseTabs.List>
      {tabs.map((t) => (
        <BaseTabs.Panel key={t.value} value={t.value}>
          {t.panel}
        </BaseTabs.Panel>
      ))}
    </BaseTabs.Root>
  );
};
