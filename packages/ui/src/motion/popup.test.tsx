import { animate } from 'motion/mini';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enterPopup } from './popup.ts';

vi.mock('motion/mini', () => ({ animate: vi.fn(() => Promise.resolve()) }));

describe('enterPopup', () => {
  beforeEach(() => vi.mocked(animate).mockClear());

  it('cascades only the first rows of a long list, so the rest are not left blank', () => {
    const menu = document.createElement('div');
    for (let i = 0; i < 40; i++) {
      const row = document.createElement('div');
      row.setAttribute('role', 'option');
      menu.append(row);
    }
    enterPopup(menu, 'dropdown');
    const rows = vi.mocked(animate).mock.calls[1]?.[0];
    expect(rows).toHaveLength(12);
  });

  it("clears the entrance's last frame once it settles", async () => {
    const menu = document.createElement('div');
    menu.style.setProperty('filter', 'blur(0px)');
    enterPopup(menu, 'dropdown');
    await Promise.resolve();
    await Promise.resolve();
    expect(menu.style.getPropertyValue('filter')).toBe('');
  });
});
