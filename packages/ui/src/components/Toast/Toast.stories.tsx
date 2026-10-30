import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { notify, Toasts } from './Toast.tsx';

const meta = {
  title: 'Overlays/Toast',
  component: Toasts,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Toasts>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Info and success fade on their own; a warning or an error stays until dismissed. */
export const Kinds: Story = {
  play: async ({ canvasElement }) => {
    notify('Saved to your working tree.', { kind: 'success', ttl: 60_000 });
    notify('Unsaved changes are kept on this device.', { ttl: 60_000 });
    notify("Couldn't write to your working tree.", {
      kind: 'error',
      action: { label: 'Retry', onClick: () => undefined },
    });
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'Couldn’t write'.replace('’', "'"),
    );
    await expect(canvas.getByRole('status')).toHaveTextContent('Saved to your working tree.');
  },
};

/** A countdown: the bar drains over the toast's life, then onExpire runs unless the action is taken. */
export const Countdown: Story = {
  play: async ({ canvasElement }) => {
    notify('Taking you back to the start.', {
      ttl: 60_000,
      progress: true,
      onExpire: () => undefined,
      action: { label: 'Stay', onClick: () => undefined },
    });
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      'Taking you back to the start.',
    );
    await expect(canvas.getByRole('button', { name: 'Stay' })).toBeInTheDocument();
  },
};
