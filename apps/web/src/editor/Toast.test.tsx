import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { notify, Toasts } from './Toast.tsx';

const kindOf = (text: string) =>
  screen.getByText(text).closest('[data-kind]')?.getAttribute('data-kind');
const hasIcon = (text: string) =>
  screen.getByText(text).closest('[data-kind]')?.querySelector('svg') !== null;

describe('Toasts', () => {
  afterEach(() => vi.useRealTimers());

  it('marks news as info or success, with an icon, politely, and lets it fade', () => {
    vi.useFakeTimers();
    render(<Toasts />);
    act(() => {
      notify('Saved content/profile.yaml.', { kind: 'success' });
      notify('Unsaved changes are kept on this device.');
    });
    const status = screen.getByRole('status');
    expect(within(status).getByText('Saved content/profile.yaml.')).toBeInTheDocument();
    expect(kindOf('Saved content/profile.yaml.')).toBe('success');
    expect(kindOf('Unsaved changes are kept on this device.')).toBe('info');
    expect(hasIcon('Saved content/profile.yaml.')).toBe(true);

    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByText('Saved content/profile.yaml.')).not.toBeInTheDocument();
  });

  it('interrupts with a warning or an error, one at a time, until dismissed', () => {
    vi.useFakeTimers();
    render(<Toasts />);
    act(() => void notify('Add a title before saving.', { kind: 'warning' }));
    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Add a title before saving.')).toBeInTheDocument();
    expect(kindOf('Add a title before saving.')).toBe('warning');
    expect(hasIcon('Add a title before saving.')).toBe(true);

    // A newer problem replaces the last, and stays however long it takes.
    act(() => void notify("Couldn't save the profile.", { kind: 'error' }));
    expect(screen.queryByText('Add a title before saving.')).not.toBeInTheDocument();
    expect(kindOf("Couldn't save the profile.")).toBe('error');
    act(() => vi.advanceTimersByTime(60_000));
    fireEvent.click(within(alert).getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText("Couldn't save the profile.")).not.toBeInTheDocument();
  });
});
