import { AlertDialog } from '@base-ui/react/alert-dialog';
import type { ReactNode } from 'react';
import styles from './editor.module.css';

/* Base UI AlertDialog: focus trap and restoration, Escape closes, state as data attributes for CSS. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  actions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  actions: ReactNode;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={styles.backdrop} />
        <AlertDialog.Popup className={styles.dialog}>
          <AlertDialog.Title className={styles.dialogTitle}>{title}</AlertDialog.Title>
          <AlertDialog.Description className={styles.dialogBody}>
            {description}
          </AlertDialog.Description>
          <div className={styles.dialogActions}>{actions}</div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
