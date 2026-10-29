import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Slider } from './Slider.tsx';

const Demo = ({ initial }: { initial: number }) => {
  const [value, setValue] = useState(initial);
  return (
    <div style={{ maxInlineSize: '22rem' }}>
      <Slider
        label="Content width"
        value={value}
        min={60}
        max={80}
        step={2}
        initial={68}
        format={(v) => `${v} characters`}
        onChange={setValue}
      />
    </div>
  );
};

const meta = { title: 'Controls/Slider', component: Demo } satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AtDefault: Story = { args: { initial: 68 } };

export const Changed: Story = { args: { initial: 76 } };

export const Dark: Story = { args: { initial: 76 }, globals: { theme: 'dark' } };
