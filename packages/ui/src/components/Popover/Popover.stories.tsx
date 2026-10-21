import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Icon } from '../../Icon.tsx';
import { Button } from '../Button/Button.tsx';
import { iconButton } from '../IconButton/IconButton.tsx';
import { Switch } from '../Switch/Switch.tsx';
import { Popover } from './Popover.tsx';

const Demo = () => {
  const [inline, setInline] = useState(false);
  return (
    <div style={{ display: 'flex', justifyContent: 'center', minBlockSize: '18rem' }}>
      <Popover
        title="Writing"
        trigger={
          <button
            type="button"
            className={iconButton({ size: 'sm' })}
            aria-label="Options for Writing"
          >
            <Icon name="lucide:pencil" size="sm" />
          </button>
        }
      >
        <Switch label="Icons in one row" checked={inline} onCheckedChange={setInline} />
        <Button size="sm">Move earlier</Button>
      </Popover>
    </div>
  );
};

const meta = { title: 'Overlays/Popover', component: Demo } satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: 'Options for Writing' }),
    );
    const panel = await within(document.body).findByRole('dialog', { name: 'Writing' });
    await waitFor(() => expect(panel.getAnimations({ subtree: true })).toHaveLength(0));
  },
};

export const OpenDark: Story = { ...Open, globals: { theme: 'dark' } };
