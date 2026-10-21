import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { Icon } from '../../Icon.tsx';
import { TipProvider } from '../Tip/Tip.tsx';
import { IconButton } from './IconButton.tsx';

describe('IconButton', () => {
  it('is named by its label, with the icon hidden from assistive tech', () => {
    render(
      <TipProvider>
        <IconButton label="Edit card">
          <Icon name="lucide:pencil" />
        </IconButton>
      </TipProvider>,
    );
    const b = screen.getByRole('button', { name: 'Edit card' });
    expect(b.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('can go without a tooltip, and still passes its ref to the button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <IconButton label="Bold" tip={false} ref={ref} aria-pressed>
        <Icon name="lucide:bold" />
      </IconButton>,
    );
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Bold', pressed: true }));
  });

  it('keeps its ref inside a tooltip too', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <TipProvider>
        <IconButton label="Search" ref={ref}>
          <Icon name="lucide:search" />
        </IconButton>
      </TipProvider>,
    );
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Search' }));
  });

  // @ts-expect-error an icon button without a label has no accessible name
  const _unnamed = <IconButton>x</IconButton>;
});
