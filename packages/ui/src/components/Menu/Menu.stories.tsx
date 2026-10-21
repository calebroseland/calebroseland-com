import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Icon } from '../../Icon.tsx';
import { iconButton } from '../IconButton/IconButton.tsx';
import { TipProvider } from '../Tip/Tip.tsx';
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
} from './Menu.tsx';

const Demo = () => {
  const [theme, setTheme] = useState('auto');
  const [edit, setEdit] = useState(true);
  return (
    <div style={{ display: 'flex', justifyContent: 'center', minBlockSize: '28rem' }}>
      <Menu
        tip="Theme"
        trigger={
          <button type="button" className={iconButton()} aria-label="Theme: Auto.">
            <Icon name="lucide:user" />
          </button>
        }
      >
        <MenuRadioGroup label="Theme" value={theme} onValueChange={setTheme}>
          <MenuRadioItem value="auto" icon="lucide:sun-moon">
            Auto
          </MenuRadioItem>
          <MenuRadioItem value="light" icon="lucide:sun">
            Light
          </MenuRadioItem>
          <MenuRadioItem value="dark" icon="lucide:moon">
            Dark
          </MenuRadioItem>
        </MenuRadioGroup>
        <MenuSeparator />
        <MenuItem icon="lucide:plus" onClick={() => undefined}>
          New custom theme…
        </MenuItem>
        <MenuSeparator />
        <MenuGroup label="Working tree">
          <MenuCheckboxItem icon="lucide:pencil" checked={edit} onCheckedChange={setEdit}>
            Edit mode
          </MenuCheckboxItem>
          <MenuItem icon="lucide:file-pen" onClick={() => undefined} disabled>
            Editor (disabled)
          </MenuItem>
          <MenuItem tone="danger" onClick={() => undefined}>
            Delete entry
          </MenuItem>
        </MenuGroup>
      </Menu>
    </div>
  );
};

const meta = {
  title: 'Overlays/Menu',
  render: () => (
    <TipProvider>
      <Demo />
    </TipProvider>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

/** Open, with a radio group, an action, a setting, a disabled row and a destructive one. */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Theme: Auto.' }));
    const menu = await within(document.body).findByRole('menu');
    // Rows cascade in; axe needs the settled colours, not a blend.
    await waitFor(() => expect(menu.getAnimations({ subtree: true })).toHaveLength(0));
    await expect(within(menu).getByRole('menuitemradio', { name: 'Auto' })).toBeChecked();
  },
};

export const OpenDark: Story = { ...Open, globals: { theme: 'dark' } };
