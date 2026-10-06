import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { InlineText } from './fields.tsx';

function Harness({ error }: { error?: string }) {
  const [value, setValue] = useState('GitHub');
  return <InlineText label="Label for GitHub" value={value} error={error} onChange={setValue} />;
}

describe('InlineText', () => {
  it('edits its text in place, named by its label', () => {
    render(<Harness />);
    const field = screen.getByRole('textbox', { name: 'Label for GitHub' });
    expect(field).toHaveValue('GitHub');
    fireEvent.change(field, { target: { value: 'Code' } });
    expect(field).toHaveValue('Code');
    expect(field).not.toHaveAttribute('aria-invalid');
  });

  it('holds leading and trailing content inside the field, around the text', () => {
    render(
      <InlineText
        label="Label for GitHub"
        value="GitHub"
        error={undefined}
        onChange={() => undefined}
        leading={<button type="button">Icon</button>}
        trailing={<span>end</span>}
      />,
    );
    const field = screen.getByRole('textbox', { name: 'Label for GitHub' });
    const control = field.parentElement as HTMLElement;
    expect([...control.children].map((c) => c.textContent || c.tagName)).toEqual([
      'Icon',
      'INPUT',
      'end',
    ]);
  });

  it('says what is wrong beside the text, and ties the message to the field', () => {
    render(<Harness error="Add a label of up to 40 characters." />);
    const field = screen.getByRole('textbox', { name: 'Label for GitHub' });
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Add a label of up to 40 characters.');
  });
});
