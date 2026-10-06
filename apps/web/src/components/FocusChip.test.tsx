import type { ResolvedTag } from '@crc/content-schema';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FocusChip } from './FocusChip.tsx';
import { TipProvider } from './Tip.tsx';

const chip = (show: ResolvedTag['show']) => {
  const { container } = render(
    <TipProvider>
      <FocusChip tag={{ label: 'React', icon: 'simple-icons:react', show, link: false }} />
    </TipProvider>,
  );
  const el = container.firstElementChild as HTMLElement;
  return { icons: el.querySelectorAll('svg').length, text: el.textContent };
};

describe('FocusChip', () => {
  it('shows only the icon, only the label, or both, as the profile says', () => {
    expect(chip('icon')).toEqual({ icons: 1, text: '' });
    expect(chip('label')).toEqual({ icons: 0, text: 'React' });
    expect(chip('both')).toEqual({ icons: 1, text: 'React' });
  });
});
