import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Icon } from './Icon.tsx';

describe('Icon', () => {
  it('draws a registered icon on first render, announced when labelled', () => {
    const { container } = render(<Icon name="simple-icons:github" label="GitHub" />);
    expect(screen.getByRole('img', { name: 'GitHub' })).toBeInTheDocument();
    expect(container.querySelector('svg path')).not.toBeNull();
  });

  it('is hidden when unlabelled', () => {
    const { container } = render(<Icon name="lucide:pencil" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('binds size to the icon token', () => {
    const { container } = render(<Icon name="lucide:pencil" size="xl" />);
    expect(container.querySelector('svg')?.getAttribute('style')).toContain('--icon-xl');
  });

  it('falls back to external-link for a name it does not know', () => {
    const known = render(<Icon name="lucide:external-link" />).container.innerHTML;
    const unknown = render(<Icon name="lucide:not-an-icon" />).container.innerHTML;
    expect(unknown).toBe(known);
  });
});
