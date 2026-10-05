import { durations, eases } from "@crc/ui";
import { type AnimationOptions, type DOMKeyframesDefinition, spring, stagger } from "motion";
import { animate } from "motion/mini";

// Web Animations, so Base UI waits for a popup's exit before unmounting it.

type Animation = ReturnType<typeof animate>;

/** Without the Web Animations API, popups and hovers simply change state with no motion. */
export const canAnimate = typeof Element !== "undefined" && "animate" in Element.prototype;

const pop: AnimationOptions = { type: spring, visualDuration: 0.28, bounce: 0.2 };
const tipPop: AnimationOptions = { type: spring, visualDuration: 0.22, bounce: 0.4 };
const hoverSpring: AnimationOptions = { type: spring, visualDuration: 0.3, bounce: 0.45 };
const leave: AnimationOptions = { duration: durations.fast, ease: [...eases.in] };

/** A starting offset pointing away from the trigger, from the popup's `data-side`. */
function fromTrigger(side: string | undefined, px: number): string {
  if (side === "top") return `0 ${px}px`;
  if (side === "bottom") return `0 ${-px}px`;
  if (side === "left" || side === "inline-start") return `${px}px 0`;
  return `${-px}px 0`;
}

export type PopupKind = "dropdown" | "tip";

const enterFrames: Record<PopupKind, (side: string | undefined) => DOMKeyframesDefinition> = {
  dropdown: (side) => ({
    opacity: [0, 1],
    scale: [0.92, 1],
    filter: ["blur(6px)", "blur(0px)"],
    translate: [fromTrigger(side, 10), "0 0"],
  }),
  tip: (side) => ({
    opacity: [0, 1],
    scale: [0.7, 1],
    translate: [fromTrigger(side, 6), "0 0"],
  }),
};

const leaveFrames: Record<PopupKind, DOMKeyframesDefinition> = {
  dropdown: { opacity: 0, scale: 0.96, filter: "blur(4px)" },
  tip: { opacity: 0, scale: 0.9 },
};

// Past this many rows the cascade would leave a long list blank for seconds; the rest arrive with the popup.
const STAGGERED_ROWS = 12;

/** Lifts a popup out of its trigger; its first menu items or select options follow one after another. */
export function enterPopup(node: HTMLElement, kind: PopupKind): Animation[] {
  const entrance = animate(
    node,
    enterFrames[kind](node.dataset.side),
    kind === "dropdown" ? pop : tipPop,
  );
  // A settled entrance leaves its last frame inline; a filter there would trap fixed-position children.
  void entrance.then(() => resetPopup(node));
  const running = [entrance];
  const rows =
    kind === "dropdown"
      ? [...node.querySelectorAll<HTMLElement>('[role^="menuitem"], [role="option"]')].slice(
          0,
          STAGGERED_ROWS,
        )
      : [];
  if (rows.length > 0) {
    running.push(
      animate(
        rows,
        { opacity: [0, 1], translate: ["0 4px", "0 0"] },
        { ...pop, delay: stagger(0.025, { startDelay: 0.03 }) },
      ),
    );
  }
  return running;
}

export function leavePopup(node: HTMLElement, kind: PopupKind): Animation[] {
  return [animate(node, leaveFrames[kind], leave)];
}

/** Drops what a finished exit left on the element, so a popup shown without its entrance is visible. */
export function resetPopup(node: HTMLElement): void {
  for (const prop of ["opacity", "scale", "filter", "translate"]) node.style.removeProperty(prop);
}

/** A link that leads with an icon: the icon zooms slightly, and the label grows with it. */
export function hoverIcon(link: HTMLElement, on: boolean): Animation[] {
  const icon = link.querySelector<HTMLElement>('[data-hover="icon"]');
  const label = link.querySelector<HTMLElement>('[data-hover="label"]');
  const running: Animation[] = [];
  if (icon) running.push(animate(icon, { scale: on ? 1.12 : 1 }, hoverSpring));
  if (label) running.push(animate(label, { scale: on ? 1.04 : 1 }, hoverSpring));
  return running;
}

/** A text link: its underline draws in from the start edge, and rests drawn on the current page. */
export function hoverUnderline(link: HTMLElement, on: boolean): Animation[] {
  const line = link.querySelector<HTMLElement>('[data-hover="underline"]');
  if (!line) return [];
  const drawn = on || link.dataset.status === "active";
  const run = animate(line, { scale: drawn ? "1 1" : "0 1" }, drawn ? hoverSpring : leave);
  // Once settled, the stylesheet decides again, so a later route change still moves the line.
  if (!on) void run.then(() => line.style.removeProperty("scale"));
  return [run];
}
