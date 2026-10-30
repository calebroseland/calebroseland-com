import { Toasts } from '@crc/ui';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoReturn } from './autoReturn.ts';

const Missing = ({ go }: { go: () => void }) => {
  useAutoReturn(go);
  return <h1>Missing</h1>;
};

const hidden = (value: boolean) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => value });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('useAutoReturn', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    hidden(false);
    vi.useRealTimers();
  });

  it('says so in a toast, then goes after twenty seconds', () => {
    const go = vi.fn();
    render(
      <>
        <Missing go={go} />
        <Toasts />
      </>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Taking you back to the start.');
    act(() => vi.advanceTimersByTime(19_999));
    expect(go).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(go).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['Stay', () => fireEvent.click(screen.getByRole('button', { name: 'Stay' }))],
    ['a click anywhere', () => fireEvent.pointerDown(document.body)],
    ['a key', () => fireEvent.keyDown(document.body, { key: 'Tab' })],
  ])('stays after %s', (_, interact) => {
    const go = vi.fn();
    render(
      <>
        <Missing go={go} />
        <Toasts />
      </>,
    );
    act(interact);
    expect(screen.queryByText('Taking you back to the start.')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(40_000));
    expect(go).not.toHaveBeenCalled();
  });

  it('cancels when the page goes away', () => {
    const go = vi.fn();
    const { rerender } = render(
      <>
        <Missing go={go} />
        <Toasts />
      </>,
    );
    rerender(<Toasts />);
    expect(screen.queryByText('Taking you back to the start.')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(40_000));
    expect(go).not.toHaveBeenCalled();
  });

  it('waits for a background tab to be seen before counting', () => {
    hidden(true);
    const go = vi.fn();
    render(
      <>
        <Missing go={go} />
        <Toasts />
      </>,
    );
    act(() => vi.advanceTimersByTime(40_000));
    expect(go).not.toHaveBeenCalled();
    expect(screen.queryByText('Taking you back to the start.')).not.toBeInTheDocument();
    act(() => hidden(false));
    expect(screen.getByText('Taking you back to the start.')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(20_000));
    expect(go).toHaveBeenCalledTimes(1);
  });
});
