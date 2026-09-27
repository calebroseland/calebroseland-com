import { Tooltip } from "@base-ui/react/tooltip";
import {
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./Tip.module.css";

/* One delay group for the whole site: a tooltip opens quickly, and once one is showing, moving to the
   next opens it at once with no fade (Base UI marks it data-instant). */
export function TipProvider({ children }: { children: ReactNode }) {
  return (
    <Tooltip.Provider delay={150} closeDelay={0} timeout={400}>
      {children}
    </Tooltip.Provider>
  );
}

/** A tooltip with an arrow pointing at the element it describes. `children` becomes the trigger. */
export function Tip({
  label,
  side = "top",
  children,
}: {
  label: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  children: ReactElement;
}) {
  const hold = useTouchHold();
  return (
    <Tooltip.Root open={hold.open} onOpenChange={hold.onOpenChange}>
      <Tooltip.Trigger render={children} className={styles.trigger} {...hold.trigger} />
      <Tooltip.Portal>
        <Tooltip.Positioner className={styles.positioner} side={side} sideOffset={8}>
          <Tooltip.Popup className={styles.popup}>
            {label}
            <Tooltip.Arrow className={styles.arrow} />
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

const HOLD_MS = 500;
const SHOWN_MS = 1500;

/* Touch has no hover, so holding a control shows its tip, as native tooltips do on Android. The press
   that ends the hold is spent on the tip: it neither follows the link nor opens a context menu. */
function useTouchHold() {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const held = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);
  const cancel = () => clearTimeout(timer.current);
  const swallow = (e: SyntheticEvent) => {
    if (!held.current) return;
    e.preventDefault();
    e.stopPropagation();
  };
  return {
    open,
    onOpenChange: (next: boolean) => {
      cancel();
      setOpen(next);
    },
    trigger: {
      onPointerDown: (e: PointerEvent) => {
        held.current = false;
        if (e.pointerType !== "touch") return;
        cancel();
        timer.current = setTimeout(() => {
          held.current = true;
          setOpen(true);
        }, HOLD_MS);
      },
      onPointerUp: () => {
        cancel();
        if (held.current) timer.current = setTimeout(() => setOpen(false), SHOWN_MS);
      },
      onPointerCancel: cancel,
      onContextMenu: swallow,
      onClickCapture: (e: SyntheticEvent) => {
        swallow(e);
        held.current = false;
      },
    },
  };
}
