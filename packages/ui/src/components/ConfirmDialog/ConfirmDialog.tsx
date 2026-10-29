import { AlertDialog } from '@base-ui/react/alert-dialog';
import type { ReactNode } from 'react';
import { Button } from '../Button/Button.tsx';
import styles from './ConfirmDialog.module.css';

type Action = { label: string; onClick: () => void };

/* An APG alert dialog (Base UI AlertDialog) that asks before something that cannot be taken back:
   focus is trapped and restored, Escape and Cancel close it through onOpenChange. The confirming
   action runs its own onClick; it closes the dialog itself, so it decides the order. */
export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirm,
  cancelLabel = 'Cancel',
  alternative,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /** The action asked about; `danger` when it destroys something. */
  confirm: Action & { tone?: 'danger' | undefined };
  cancelLabel?: string;
  /** A third way out, between cancelling and confirming (reload instead of overwrite). */
  alternative?: Action | undefined;
}) => {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={styles.backdrop} />
        <AlertDialog.Popup className={styles.dialog}>
          <AlertDialog.Title className={styles.title}>{title}</AlertDialog.Title>
          <AlertDialog.Description className={styles.description}>
            {description}
          </AlertDialog.Description>
          <div className={styles.actions}>
            <AlertDialog.Close render={<Button />}>{cancelLabel}</AlertDialog.Close>
            {alternative && <Button onClick={alternative.onClick}>{alternative.label}</Button>}
            <Button variant="primary" tone={confirm.tone} onClick={confirm.onClick}>
              {confirm.label}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};
