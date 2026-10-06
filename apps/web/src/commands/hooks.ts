import { useStore } from '@tanstack/react-store';
import { useEffect, useState } from 'react';
import { useSiteGo } from '../components/backToCard.ts';
import { useCurrentHref } from '../hooks/useCurrentHref.ts';
import { palette } from './palette.ts';
import { allCommands, type Command, commandSources, visibleFor } from './registry.ts';

export type CommandGroup = { value: string; items: Command[] };

/** True from the first time `value` is true: keeps the lazily loaded palette mounted to animate out. */
export function useHasBeenTrue(value: boolean): boolean {
  const [seen, setSeen] = useState(value);
  if (value && !seen) setSeen(true);
  return seen;
}

/** The palette's view: the page stack (for nested commands), the query, and the grouped commands. */
export function usePaletteView(open: boolean) {
  const [stack, setStack] = useState<readonly Command[]>([]);
  const [query, setQuery] = useState('');
  const sources = useStore(commandSources);
  // A fresh palette each time it opens.
  useEffect(() => {
    if (!open) {
      setStack([]);
      setQuery('');
    }
  }, [open]);
  const page = stack.at(-1);
  const commands = visibleFor(page?.page ? page.page() : allCommands(sources), query);
  const groups: CommandGroup[] = [];
  for (const c of commands) {
    const group = groups.find((g) => g.value === c.group);
    if (group) group.items.push(c);
    else groups.push({ value: c.group, items: [c] });
  }
  return {
    page,
    query,
    setQuery,
    groups,
    enter: (c: Command) => {
      setStack((s) => [...s, c]);
      setQuery('');
    },
    back: () => {
      setStack((s) => s.slice(0, -1));
      setQuery('');
    },
  };
}

/** Runs a command with what it needs: navigation that closes the palette, and where the visitor is. */
export function useRunCommand() {
  const go = useSiteGo();
  const href = useCurrentHref();
  return (c: Command) =>
    c.run?.({
      href,
      close: palette.close,
      go: async (to) => {
        palette.close();
        await go(to);
      },
    });
}
