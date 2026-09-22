import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  attachClosestEdge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { useEffect, useRef, useState } from "react";
import { dropIndex, type Edge, reorder } from "./reorder.ts";

/* Pointer drag-and-drop for a list. Pragmatic DnD owns the drag; the caller re-renders with the new
   order after drop (Motion `layout` on the *other* items is fine, never on the dragged one). Keyboard
   reordering is a separate path built on the same pure `reorder`. Several lists can share a page: each
   names itself with `listId`, and drags never cross between lists. */

type Item = { id: string };
const SYMBOL = Symbol("crc-list-item");
type DragData = { [SYMBOL]: true; id: string; index: number; listId: string };
const isDragData = (d: Record<string | symbol, unknown>): d is DragData => d[SYMBOL] === true;
const DEFAULT_LIST = "list";

export type ListOptions = { listId?: string };
export type ItemOptions = ListOptions & { axis?: "vertical" | "horizontal" };

export function useListReorder<T extends Item>(
  items: readonly T[],
  onReorder: (next: T[]) => void,
  { listId = DEFAULT_LIST }: ListOptions = {},
) {
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  useEffect(
    () =>
      monitorForElements({
        canMonitor: ({ source }) => isDragData(source.data) && source.data.listId === listId,
        onDrop({ source, location }) {
          const target = location.current.dropTargets[0];
          if (!target || !isDragData(source.data) || !isDragData(target.data)) return;
          if (target.data.listId !== listId) return;
          const edge = extractClosestEdge(target.data) as Edge | null;
          if (!edge) return;
          const to = dropIndex(source.data.index, target.data.index, edge);
          if (to !== source.data.index)
            onReorderRef.current(reorder(itemsRef.current, source.data.index, to));
        },
      }),
    [listId],
  );

  return { registerItem: useItemRegistration };
}

/** Attach to one row or chip: `const { ref, handleRef, state } = useItemRegistration(id, index)`. */
export function useItemRegistration(
  id: string,
  index: number,
  { listId = DEFAULT_LIST, axis = "vertical" }: ItemOptions = {},
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
    const data: DragData = { [SYMBOL]: true, id, index, listId };
    const allowedEdges: Edge[] = axis === "vertical" ? ["top", "bottom"] : ["left", "right"];
    return combine(
      draggable({
        element: el,
        dragHandle: handleRef.current ?? el,
        getInitialData: () => data,
        onDragStart: () => setState({ dragging: true, edge: null }),
        onDrop: () => setState({ dragging: false, edge: null }),
      }),
      dropTargetForElements({
        element: el,
        canDrop: ({ source }) =>
          isDragData(source.data) && source.data.listId === listId && source.data.id !== id,
        getData: ({ input, element }) => attachClosestEdge(data, { input, element, allowedEdges }),
        onDrag: ({ self }) => {
          const edge = extractClosestEdge(self.data) as Edge | null;
          setState((s) => (s.edge === edge ? s : { ...s, edge }));
        },
        onDragLeave: () => setState((s) => ({ ...s, edge: null })),
        onDrop: () => setState((s) => ({ ...s, edge: null })),
      }),
    );
  }, [id, index, listId, axis]);

  return { ref, handleRef, state };
}
