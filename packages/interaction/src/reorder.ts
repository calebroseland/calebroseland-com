/* Pure list reordering shared by pointer drag-and-drop and the keyboard "Move" menu, so both paths
   produce identical results and the keyboard path is testable without a DOM. */

/** Where a drop lands on a row (vertical lists) or a chip (horizontal lists). */
export type Edge = 'top' | 'bottom' | 'left' | 'right';

export function reorder<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as T);
  return next;
}

/** Index the dragged item lands on when dropped on `target` at `edge`. */
export function dropIndex(from: number, target: number, edge: Edge): number {
  let to = edge === 'top' || edge === 'left' ? target : target + 1;
  if (from < to) {
    to -= 1;
  }
  return to;
}

export type MoveCommand = 'up' | 'down' | 'top' | 'bottom';

export function moveIndex(index: number, length: number, command: MoveCommand): number {
  switch (command) {
    case 'up':
      return Math.max(0, index - 1);
    case 'down':
      return Math.min(length - 1, index + 1);
    case 'top':
      return 0;
    case 'bottom':
      return length - 1;
  }
}

export function moveAnnouncement(label: string, to: number, length: number): string {
  return `${label} moved to position ${to + 1} of ${length}`;
}
