import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TextField } from './Field.tsx';

describe('TextField', () => {
  it('is labelled, described, and reports each edit', () => {
    const onValueChange = vi.fn();
    render(
      <TextField label="Slug" value="a" onValueChange={onValueChange} description="Fixed later." />,
    );
    const field = screen.getByRole('textbox', { name: 'Slug' });
    expect(field).toHaveAccessibleDescription('Fixed later.');
    fireEvent.change(field, { target: { value: 'ab' } });
    expect(onValueChange).toHaveBeenCalledWith('ab', expect.anything());
  });

  it('marks itself invalid and says why, in place of its description', () => {
    render(
      <TextField
        label="Slug"
        value="A B"
        onValueChange={() => undefined}
        description="Fixed later."
        error="Lowercase words only."
      />,
    );
    const field = screen.getByRole('textbox', { name: 'Slug' });
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Lowercase words only.')).toBeInTheDocument();
    expect(screen.queryByText('Fixed later.')).not.toBeInTheDocument();
  });
});
