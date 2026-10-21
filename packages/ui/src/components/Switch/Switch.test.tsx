import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from './Switch.tsx';

describe('Switch', () => {
  it('is a switch named by its label, and reports the new state', () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Icons in one row" checked={false} onCheckedChange={onCheckedChange} />);
    const control = screen.getByRole('switch', { name: 'Icons in one row' });
    expect(control).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(control);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});
