import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Slider } from './Slider.tsx';

const chars = (v: number) => `${v} characters`;

describe('Slider', () => {
  it('is a slider named by its label, showing and announcing the formatted value', () => {
    render(
      <Slider
        label="Content width"
        value={68}
        min={45}
        max={160}
        step={1}
        format={chars}
        onChange={vi.fn()}
      />,
    );
    const thumb = screen.getByRole('slider', { name: 'Content width' });
    expect(thumb).toHaveAttribute('aria-valuetext', '68 characters');
    expect(screen.getByText('68 characters')).toBeVisible();
  });

  it('resets to its initial value, and says so', () => {
    const onChange = vi.fn();
    render(
      <Slider
        label="Content width"
        value={90}
        min={45}
        max={160}
        step={1}
        initial={68}
        format={chars}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reset content width to 68 characters' }));
    expect(onChange).toHaveBeenCalledWith(68);
  });
});
