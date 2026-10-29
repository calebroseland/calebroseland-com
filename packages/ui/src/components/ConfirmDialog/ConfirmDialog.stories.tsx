import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
import { ConfirmDialog } from './ConfirmDialog.tsx';

const meta = {
  title: 'Overlays/ConfirmDialog',
  component: ConfirmDialog,
  args: {
    open: true,
    onOpenChange: () => undefined,
    title: 'Delete ‘about’?',
    description:
      'This deletes content/pages/about from your working tree. It is an ordinary file deletion you can undo with git.',
    confirm: { label: 'Delete', tone: 'danger', onClick: () => undefined },
  },
  play: async () => {
    const dialog = await within(document.body).findByRole('alertdialog');
    // It fades in; axe needs the settled colours.
    await waitFor(() => expect(getComputedStyle(dialog).opacity).toBe('1'));
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Destructive: Story = {};

/** Three ways out: cancel, the alternative, and the destructive one. */
export const WithAlternative: Story = {
  args: {
    title: 'This file changed on disk since you opened it.',
    description:
      'Reload to see what is on disk now (your unsaved edits are discarded), or overwrite the file with what you have here.',
    alternative: { label: 'Reload from disk', onClick: () => undefined },
    confirm: { label: 'Overwrite', tone: 'danger', onClick: () => undefined },
  },
};

export const DestructiveDark: Story = { globals: { theme: 'dark' } };
