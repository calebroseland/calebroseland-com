import { describe, expect, it } from 'vitest';
import { isPlainClick } from './dom.ts';

const click = (over: Partial<MouseEvent> = {}) => ({
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...over,
});

describe('isPlainClick', () => {
  it('is a primary click with no modifier', () => {
    expect(isPlainClick(click())).toBe(true);
  });

  it('leaves modified and non-primary clicks to the browser', () => {
    for (const over of [
      { metaKey: true },
      { ctrlKey: true },
      { shiftKey: true },
      { altKey: true },
      { button: 1 },
    ]) {
      expect(isPlainClick(click(over))).toBe(false);
    }
  });
});
