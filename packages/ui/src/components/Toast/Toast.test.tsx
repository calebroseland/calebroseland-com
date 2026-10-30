import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { dismiss, notify, Toasts, update } from './Toast.tsx';

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

  it('runs onExpire when it times out, with a draining bar', () => {
    vi.useFakeTimers();
    const onExpire = vi.fn();
    render(<Toasts />);
    act(() => void notify('Leaving soon.', { ttl: 10_000, onExpire, countdown: true }));
    const toast = screen.getByText('Leaving soon.').closest('[data-kind]');
    expect(toast?.querySelector('[aria-hidden="true"][style*="10000ms"]')).not.toBeNull();
    act(() => vi.advanceTimersByTime(10_000));
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Leaving soon.')).not.toBeInTheDocument();
  });

  it('never expires once its action is taken or it is dismissed', () => {
    vi.useFakeTimers();
    const onExpire = vi.fn();
    const onClick = vi.fn();
    render(<Toasts />);
    act(() => void notify('First.', { ttl: 10_000, onExpire, action: { label: 'Stay', onClick } }));
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('First.')).not.toBeInTheDocument();
    const id = notify('Second.', { ttl: 10_000, onExpire });
    act(() => dismiss(id));
    act(() => vi.advanceTimersByTime(20_000));
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('shows a task filling forward, stays while it runs, then fades once it ends', () => {
    vi.useFakeTimers();
    render(<Toasts />);
    let id = 0;
    act(() => {
      id = notify('Uploading 3 images.', { progress: 0 });
    });
    const bar = screen.getByRole('progressbar', { name: 'Uploading 3 images.' });
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    act(() => vi.advanceTimersByTime(60_000));
    act(() => update(id, { message: 'Uploading 3 images: 2 done.', progress: 2 / 3 }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67');
    act(() => update(id, { message: 'Uploaded 3 images.', kind: 'success', progress: null }));
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(kindOf('Uploaded 3 images.')).toBe('success');
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByText('Uploaded 3 images.')).not.toBeInTheDocument();
  });

  it('marks a task of unknown length as busy, with no value', () => {
    render(<Toasts />);
    act(() => void notify('Publishing.', { progress: 'busy' }));
    expect(screen.getByRole('progressbar', { name: 'Publishing.' })).not.toHaveAttribute(
      'aria-valuenow',
    );
  });
});
