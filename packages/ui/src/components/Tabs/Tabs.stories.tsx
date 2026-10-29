import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Tabs } from './Tabs.tsx';

const Demo = () => {
  const [panel, setPanel] = useState<'meta' | 'media'>('meta');
  return (
    <Tabs
      label="Panel"
      value={panel}
      onValueChange={setPanel}
      tabs={[
        { value: 'meta', label: 'Details', panel: <p>Title, slug, date and tags.</p> },
        { value: 'media', label: 'Images (2)', panel: <p>Alt text for each image.</p> },
      ]}
    />
  );
};

const meta = { title: 'Controls/Tabs', component: Demo } satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Arrow keys move between tabs and select as they go. */
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole('tab', { name: 'Details' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    const images = canvas.getByRole('tab', { name: 'Images (2)' });
    await expect(images).toHaveAttribute('aria-selected', 'true');
    // The selected tab is marked by its underline, which the other tab does not have.
    const underline = (el: Element) => getComputedStyle(el).borderBlockEndColor;
    await expect(underline(images)).not.toBe(
      underline(canvas.getByRole('tab', { name: 'Details' })),
    );
    // The panel it leaves fades out before it unmounts.
    await waitFor(() =>
      expect(canvas.getByRole('tabpanel')).toHaveTextContent('Alt text for each image.'),
    );
  },
};

export const DefaultDark: Story = { globals: { theme: 'dark' } };
