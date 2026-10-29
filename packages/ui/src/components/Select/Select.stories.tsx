import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Icon } from '../../Icon.tsx';
import { Select } from './Select.tsx';

const FONTS = [
  { value: 'serif', label: 'IBM Plex Serif', style: { fontFamily: 'serif' } },
  { value: 'sans', label: 'System sans', style: { fontFamily: 'system-ui' } },
  { value: 'mono', label: 'IBM Plex Mono', style: { fontFamily: 'monospace' } },
] as const;

const Labelled = () => {
  const [font, setFont] = useState<(typeof FONTS)[number]['value']>('serif');
  return (
    <div style={{ maxInlineSize: '20rem', minBlockSize: '16rem' }}>
      <Select label="Text font" value={font} options={FONTS} onValueChange={setFont} />
    </div>
  );
};

const meta = { title: 'Controls/Select', component: Labelled } satisfies Meta<typeof Labelled>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('combobox', { name: 'Text font' }));
    const list = await within(document.body).findByRole('listbox');
    await waitFor(() => expect(list.getAnimations({ subtree: true })).toHaveLength(0));
  },
};

/** A trigger that shows only the value (an icon), named by a hidden label; options lead with icons. */
export const IconOnly: Story = {
  render: () => {
    const icons = ['lucide:pencil', 'lucide:link', 'lucide:mail'] as const;
    return (
      <Select
        hiddenLabel="Icon for GitHub"
        value="lucide:pencil"
        options={icons.map((i) => ({ value: i, label: i, leading: <Icon name={i} size="sm" /> }))}
        renderValue={(v) => <Icon name={v} />}
        onValueChange={() => undefined}
      />
    );
  },
};
