import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { TextField } from './Field.tsx';

const Demo = (props: { error?: string; description?: string; size?: 'md' | 'sm' }) => {
  const [value, setValue] = useState(props.error ? 'Not A Slug' : 'hello-world');
  return (
    <div style={{ maxInlineSize: '24rem' }}>
      <TextField label="Slug" value={value} onValueChange={setValue} {...props} />
    </div>
  );
};

const meta = { title: 'Controls/TextField', component: Demo } satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { description: 'Fixed after the first save.' } };

export const Invalid: Story = { args: { error: 'Lowercase words separated by single hyphens.' } };

export const Small: Story = { args: { size: 'sm' } };

export const InvalidDark: Story = { ...Invalid, globals: { theme: 'dark' } };
