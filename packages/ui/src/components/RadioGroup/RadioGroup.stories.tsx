import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { RadioGroup } from './RadioGroup.tsx';

const OPTIONS = [
  { value: 'icon', label: 'Icon' },
  { value: 'label', label: 'Label' },
  { value: 'both', label: 'Both' },
] as const;

const Demo = ({ disabled }: { disabled: boolean }) => {
  const [show, setShow] = useState<(typeof OPTIONS)[number]['value']>('both');
  return (
    <div style={{ maxInlineSize: '20rem' }}>
      <RadioGroup
        legend="Show"
        value={show}
        options={OPTIONS}
        onValueChange={setShow}
        disabled={disabled}
      />
    </div>
  );
};

const meta = { title: 'Controls/RadioGroup', component: Demo } satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { disabled: false } };

export const Disabled: Story = { args: { disabled: true } };

export const DefaultDark: Story = { args: { disabled: false }, globals: { theme: 'dark' } };
