import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Icon } from '../../Icon.tsx';
import { Tip, TipProvider } from './Tip.tsx';

const meta = {
  title: 'Overlays/Tip',
  component: Tip,
  decorators: [
    (Story) => (
      <TipProvider>
        <div
          style={{
            padding: 'var(--space-12)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          <Story />
        </div>
      </TipProvider>
    ),
  ],
  args: {
    label: 'Search',
    side: 'top',
    children: (
      <button type="button" aria-label="Search">
        <Icon name="lucide:search" />
      </button>
    ),
  },
} satisfies Meta<typeof Tip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Top: Story = {};

export const Bottom: Story = { args: { side: 'bottom' } };

/** Hover shows it after the group's short delay. */
export const OnHover: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByRole('button', { name: 'Search' }));
    const tip = await within(document.body).findByText('Search', {}, { timeout: 2000 });
    // It springs in from transparent; axe needs the settled colours, not a blend.
    await waitFor(() => expect(tip.getAnimations({ subtree: true })).toHaveLength(0));
    await expect(tip).toBeVisible();
  },
};
