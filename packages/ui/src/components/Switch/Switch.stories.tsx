import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Switch } from './Switch.tsx';

const Demo = ({ initial }: { initial: boolean }) => {
  const [on, setOn] = useState(initial);
  return (
    <div style={{ maxInlineSize: '20rem' }}>
      <Switch label="Icons in one row" checked={on} onCheckedChange={setOn} />
    </div>
  );
};

const meta = { title: 'Controls/Switch', component: Demo } satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Off: Story = { args: { initial: false } };

export const On: Story = { args: { initial: true } };

export const OnDark: Story = { args: { initial: true }, globals: { theme: 'dark' } };
