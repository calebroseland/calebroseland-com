import type { IconName } from "@crc/ui/icons";
import { Store } from "@tanstack/store";

/* The command palette's commands. Any part of the app registers a source; the palette reads them all
   when it opens, so a source always reflects current state. */

type CommandContext = {
  /** Closes the palette and goes to an in-app address (path, search and hash). */
  go: (href: string) => Promise<void>;
  close: () => void;
  /** Where the visitor is now, for coming back after signing in. */
  href: string;
};

export type Command = {
  id: string;
  title: string;
  /** Heading the command is listed under, e.g. "Go to", "Posts", "Preferences". */
  group: string;
  keywords?: readonly string[];
  icon?: IconName;
  /** Trailing text: a shortcut, a state ("Current"), or a kind. */
  hint?: string;
  /** Listed only when the query is exactly one of its keywords (an easter egg). */
  hidden?: boolean;
  /** Either an action, or a nested page of commands (a theme picker, a game menu). */
  run?: (ctx: CommandContext) => void | Promise<void>;
  page?: () => readonly Command[];
};

type Source = () => readonly Command[];

const sources = new Store<ReadonlyMap<string, Source>>(new Map());

/** Adds commands under an id, replacing any already there; returns the way to remove them. */
export function registerCommands(id: string, source: Source): () => void {
  sources.setState((current) => new Map(current).set(id, source));
  return () =>
    sources.setState((current) => {
      if (current.get(id) !== source) return current;
      const next = new Map(current);
      next.delete(id);
      return next;
    });
}

export const commandSources = sources;

/** Every registered command, in registration order. */
export function allCommands(map: ReadonlyMap<string, Source> = sources.state): Command[] {
  return [...map.values()].flatMap((source) => source());
}

/** What the palette lists for a query: visible commands, plus hidden ones named exactly. */
export function visibleFor(commands: readonly Command[], query: string): Command[] {
  const q = query.trim().toLowerCase();
  return commands.filter(
    (c) => !c.hidden || (q !== "" && (c.keywords ?? []).some((k) => k.toLowerCase() === q)),
  );
}

/** The text a query is matched against: the title and every keyword. */
export const searchText = (c: Command): string => [c.title, ...(c.keywords ?? [])].join(" ");
