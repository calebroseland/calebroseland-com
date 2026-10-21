import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from './Icon.tsx';

const meta = {
  title: 'Foundations/Icon',
  component: Icon,
  args: { name: 'lucide:pencil', size: 'md' },
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Labelled: Story = { args: { label: 'Edit' } };
