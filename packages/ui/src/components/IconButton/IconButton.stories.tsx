import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from '../../Icon.tsx';
import { TipProvider } from '../Tip/Tip.tsx';
import { IconButton } from './IconButton.tsx';

const meta = {
  title: 'Controls/IconButton',
  component: IconButton,
  decorators: [
    (Story) => (
      <TipProvider>
        <Story />
      </TipProvider>
    ),
  ],
  args: { label: 'Edit card', children: <Icon name="lucide:pencil" /> },
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ghost: Story = {};

/** Toolbar and list-row size, without a tooltip; pressed shows a toggle that is on. */
export const Small: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
      <IconButton label="Bold" size="sm" tip={false} aria-pressed>
        <Icon name="lucide:bold" size="sm" />
      </IconButton>
      <IconButton label="Italic" size="sm" tip={false} aria-pressed={false}>
        <Icon name="lucide:italic" size="sm" />
      </IconButton>
      <IconButton label="Actions" size="sm" tip={false}>
        <Icon name="lucide:ellipsis-vertical" size="sm" />
      </IconButton>
    </div>
  ),
};

export const Round: Story = {
  args: { shape: 'round', label: 'Close', children: <Icon name="lucide:x" /> },
};

export const Disabled: Story = { args: { disabled: true } };

/** Over an image's dark scrim, as in the image viewer. */
export const Scrim: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-2)',
        padding: 'var(--space-4)',
        color: 'var(--color-viewer-on-scrim)',
        background: 'var(--color-viewer-scrim)',
      }}
    >
      <IconButton label="Zoom in" variant="scrim" shape="round" tip={false}>
        <Icon name="lucide:plus" />
      </IconButton>
      <IconButton label="Previous" variant="scrim" shape="round" tip={false} aria-disabled>
        <Icon name="lucide:chevron-left" />
      </IconButton>
    </div>
  ),
};

export const GhostDark: Story = { globals: { theme: 'dark' } };
