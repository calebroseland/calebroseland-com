import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog.tsx';

describe('ConfirmDialog', () => {
  it('is an alert dialog named by its question; Cancel closes, confirm runs its action', async () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    const onReload = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Delete ‘about’?"
        description="This deletes content/pages/about."
        confirm={{ label: 'Delete', tone: 'danger', onClick: onConfirm }}
        alternative={{ label: 'Reload', onClick: onReload }}
      />,
    );
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete ‘about’?' });
    expect(dialog).toHaveAccessibleDescription('This deletes content/pages/about.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reload' }));
    expect(onReload).toHaveBeenCalledOnce();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });
});
