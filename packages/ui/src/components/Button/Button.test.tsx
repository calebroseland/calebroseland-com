import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button, button } from './Button.tsx';

describe('Button', () => {
  it('is a plain button by default, so it never submits a form by accident', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('while pending, is disabled and announced as busy, keeping its label', () => {
    const onClick = vi.fn();
    render(
      <Button pending onClick={onClick}>
        Saving…
      </Button>,
    );
    const b = screen.getByRole('button', { name: 'Saving…' });
    expect(b).toBeDisabled();
    expect(b).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(b);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('passes its ref to the element, for focus management and Base UI parts', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Go</Button>);
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Go' }));
  });

  it('gives a link the same look through its class recipe', () => {
    expect(button({ variant: 'primary', tone: 'danger', size: 'sm' }).split(' ')).toHaveLength(4);
    expect(button()).toBe(button({ variant: 'secondary', size: 'md' }));
  });
});
