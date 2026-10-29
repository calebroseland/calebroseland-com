import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Menu, MenuCheckboxItem, MenuItem } from './Menu.tsx';

const Setting = ({ onDelete }: { onDelete: () => void }) => {
  const [on, setOn] = useState(false);
  return (
    <Menu
      trigger={
        <button type="button" aria-label="Actions">
          …
        </button>
      }
    >
      <MenuCheckboxItem checked={on} onCheckedChange={setOn}>
        Edit mode
      </MenuCheckboxItem>
      <MenuItem tone="danger" onClick={onDelete}>
        Delete entry
      </MenuItem>
    </Menu>
  );
};

describe('Menu', () => {
  it('opens from its trigger; a setting stays open after a change, an action runs and closes', async () => {
    const onDelete = vi.fn();
    render(<Setting onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    const menu = await screen.findByRole('menu');
    const setting = within(menu).getByRole('menuitemcheckbox', { name: 'Edit mode' });
    fireEvent.click(setting);
    expect(setting).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Delete entry' }));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
