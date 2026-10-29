import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button.tsx';
import { Alert } from './Alert.tsx';

const meta = { title: 'Feedback/Alert', component: Alert } satisfies Meta<typeof Alert>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Danger: Story = {
  args: {
    tone: 'danger',
    children: (
      <>
        Couldn't read your working tree. <Button variant="inline">Retry</Button>
      </>
    ),
  },
};

export const Info: Story = {
  args: {
    tone: 'info',
    children: (
      <>
        Restored unsaved changes from this device.
        <Button variant="inline">Discard local changes</Button>
      </>
    ),
  },
};

export const DangerDark: Story = { ...Danger, globals: { theme: 'dark' } };

export const InfoDark: Story = { ...Info, globals: { theme: 'dark' } };
