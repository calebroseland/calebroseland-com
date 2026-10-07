import { describe, expect, it } from 'vitest';
import { allCommands, type Command, registerCommands, visibleFor } from './registry.ts';

const go = (id: string, extra: Partial<Command> = {}): Command => ({
  id,
  title: id,
  group: 'Go to',
  ...extra,
});

describe('command registry', () => {
  it('lists what each source provides, and forgets a source when it unregisters', () => {
    const offA = registerCommands('a', () => [go('one')]);
    const offB = registerCommands('b', () => [go('two'), go('three')]);
    expect(allCommands().map((c) => c.id)).toEqual(['one', 'two', 'three']);
    offA();
    expect(allCommands().map((c) => c.id)).toEqual(['two', 'three']);
    offB();
    expect(allCommands()).toEqual([]);
  });

  it('reads a source when asked, so commands reflect current state', () => {
    let theme = 'light';
    const off = registerCommands('theme', () => [go(`theme:${theme}`)]);
    theme = 'dark';
    expect(allCommands().map((c) => c.id)).toEqual(['theme:dark']);
    off();
  });

  it("keeps a replacement when the replaced source's cleanup runs late", () => {
    const first = registerCommands('x', () => [go('first')]);
    const second = registerCommands('x', () => [go('second')]);
    first();
    expect(allCommands().map((c) => c.id)).toEqual(['second']);
    second();
  });

  it('shows a hidden command only when the query names it exactly', () => {
    const egg = go('game.asteroids', { hidden: true, keywords: ['asteroids'] });
    const commands = [go('home'), egg];
    expect(visibleFor(commands, '').map((c) => c.id)).toEqual(['home']);
    expect(visibleFor(commands, 'aster').map((c) => c.id)).toEqual(['home']);
    expect(visibleFor(commands, ' Asteroids ').map((c) => c.id)).toEqual([
      'home',
      'game.asteroids',
    ]);
  });
});
