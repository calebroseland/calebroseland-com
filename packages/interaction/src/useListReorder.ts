import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { preserveOffsetOnSource } from "@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import {
  attachClosestEdge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { useEffect, useRef, useState } from "react";
import styles from "./DropIndicator.module.css";
import { dropIndex, type Edge, reorder } from "./reorder.ts";

/* Pointer drag-and-drop for lists. Pragmatic DnD owns the drag; the caller re-renders with the new
   order after drop (Motion `layout` on the *other* items is fine, never on the dragged one). Keyboard
   reordering is a separate path built on the same pure `reorder`. Each list names itself with `listId`;
   lists that share a `kind` trade items (links between groups), other drags never cross. */

type Item = { id: string };
const SYMBOL = Symbol("crc-list-item");
type DragData = { [SYMBOL]: true; id: string; index: number; listId: string; kind: string };
type ListData = { [SYMBOL]: "list"; listId: string; kind: string; length: number };
const isDragData = (d: Record<string | symbol, unknown>): d is DragData => d[SYMBOL] === true;
const isListData = (d: Record<string | symbol, unknown>): d is ListData => d[SYMBOL] === "list";
const DEFAULT_LIST = "list";

/** A place in a list: where a drag started, or the index it ends at once moved. */
export type Slot = { listId: string; index: number };
export type ListOptions = { listId?: string };
export type ItemOptions = ListOptions & {
  kind?: string;
  /** Which edges a drop can land on: a column, a row, or a wrapping grid (all four). */
  axis?: "vertical" | "horizontal" | "grid";
};

const EDGES: Record<NonNullable<ItemOptions["axis"]>, Edge[]> = {
  vertical: ["top", "bottom"],
  horizontal: ["left", "right"],
  grid: ["top", "bottom", "left", "right"],
};

/** Calls `onMove` for every drop of a `kind` item; `to.index` is where the item ends up. */
export function useDragMoves(kind: string, onMove: (from: Slot, to: Slot) => void) {
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  useEffect(
    () =>
      monitorForElements({
        canMonitor: ({ source }) => isDragData(source.data) && source.data.kind === kind,
        onDrop({ source, location }) {
          const target = location.current.dropTargets[0];
          if (!target || !isDragData(source.data)) return;
          const from = { listId: source.data.listId, index: source.data.index };
          const same = (listId: string) => listId === from.listId;
          if (isListData(target.data)) {
            const { listId, length } = target.data;
            onMoveRef.current(from, { listId, index: same(listId) ? length - 1 : length });
            return;
          }
          if (!isDragData(target.data)) return;
          const edge = extractClosestEdge(target.data) as Edge | null;
          if (!edge) return;
          const { listId, index } = target.data;
          const after = edge === "bottom" || edge === "right";
          const to = same(listId) ? dropIndex(from.index, index, edge) : index + (after ? 1 : 0);
          if (!same(listId) || to !== from.index) onMoveRef.current(from, { listId, index: to });
        },
      }),
    [kind],
  );
}

/** One list reordered within itself. */
export function useListReorder<T extends Item>(
  items: readonly T[],
  onReorder: (next: T[]) => void,
  { listId = DEFAULT_LIST }: ListOptions = {},
) {
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useDragMoves(listId, (from, to) => {
    if (from.listId === listId && to.listId === listId)
      onReorder(reorder(itemsRef.current, from.index, to.index));
  });
  return { registerItem: useItemRegistration };
}

/** Attach to one row or chip: `const { ref, handleRef, state } = useItemRegistration(id, index)`. */
export function useItemRegistration(
  id: string,
  index: number,
  { listId = DEFAULT_LIST, kind = listId, axis = "vertical" }: ItemOptions = {},
) {
  const ref = useRef<HTMLElement | null>(null);
  const handleRef = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<{ dragging: boolean; edge: Edge | null }>({
    dragging: false,
    edge: null,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const data: DragData = { [SYMBOL]: true, id, index, listId, kind };
    const allowedEdges = EDGES[axis];
    return combine(
      draggable({
        element: el,
        dragHandle: handleRef.current ?? el,
        getInitialData: () => data,
        // The browser's own snapshot goes wrong inside a transformed ancestor (the card is one), taking
        // everything from the item to the corner; a copy drawn outside it is exact.
        onGenerateDragPreview: ({ nativeSetDragImage, location }) =>
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: preserveOffsetOnSource({ element: el, input: location.current.input }),
            render: ({ container }) => {
              const frame = document.createElement("div");
              frame.className = styles.preview ?? "";
              frame.style.inlineSize = `${el.getBoundingClientRect().width}px`;
              frame.append(el.cloneNode(true));
              container.append(frame);
            },
          }),
        onDragStart: () => setState({ dragging: true, edge: null }),
        onDrop: () => setState({ dragging: false, edge: null }),
      }),
      dropTargetForElements({
        element: el,
        canDrop: ({ source }) =>
          isDragData(source.data) && source.data.kind === kind && source.data.id !== id,
        getData: ({ input, element }) => attachClosestEdge(data, { input, element, allowedEdges }),
        onDrag: ({ self }) => {
          const edge = extractClosestEdge(self.data) as Edge | null;
          setState((s) => (s.edge === edge ? s : { ...s, edge }));
        },
        onDragLeave: () => setState((s) => ({ ...s, edge: null })),
        onDrop: () => setState((s) => ({ ...s, edge: null })),
      }),
    );
  }, [id, index, listId, kind, axis]);

  return { ref, handleRef, state };
}

/** Attach to a list's container so a drop past its items, or into an empty list, lands at its end. */
export function useListTarget({
  listId,
  kind = listId,
  length,
}: {
  listId: string;
  kind?: string;
  length: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [over, setOver] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const data: ListData = { [SYMBOL]: "list", listId, kind, length };
    return dropTargetForElements({
      element: el,
      canDrop: ({ source }) => isDragData(source.data) && source.data.kind === kind,
      getData: () => data,
      // Only when no item inside is the closer target.
      onDrag: ({ location, self }) =>
        setOver(location.current.dropTargets[0]?.element === self.element),
      onDragLeave: () => setOver(false),
      onDrop: () => setOver(false),
    });
  }, [listId, kind, length]);
  return { ref, over };
}
