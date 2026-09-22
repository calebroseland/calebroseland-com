import { Tooltip } from "@base-ui/react/tooltip";
import type { ReactElement, ReactNode } from "react";
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
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} />
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
