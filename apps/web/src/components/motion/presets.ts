import { canAnimate, leave } from '@crc/ui';
import { type AnimationOptions, spring } from 'motion';
import { animate } from 'motion/mini';

/* Hover motion for the site's links. Popups spring in and out with @crc/ui's popup motion. */

type Animation = ReturnType<typeof animate>;

export { canAnimate };

const hoverSpring: AnimationOptions = { type: spring, visualDuration: 0.3, bounce: 0.45 };

/** A link that leads with an icon: the icon zooms slightly, and the label grows with it. */
export const hoverIcon = (link: HTMLElement, on: boolean): Animation[] => {
  const icon = link.querySelector<HTMLElement>('[data-hover="icon"]');
  const label = link.querySelector<HTMLElement>('[data-hover="label"]');
  const running: Animation[] = [];
  if (icon) {
    running.push(animate(icon, { scale: on ? 1.12 : 1 }, hoverSpring));
  }
  if (label) {
    running.push(animate(label, { scale: on ? 1.04 : 1 }, hoverSpring));
  }
  return running;
};

/** A text link: its underline draws in from the start edge, and rests drawn on the current page. */
export const hoverUnderline = (link: HTMLElement, on: boolean): Animation[] => {
  const line = link.querySelector<HTMLElement>('[data-hover="underline"]');
  if (!line) {
    return [];
  }
  const drawn = on || link.dataset.status === 'active';
  const run = animate(line, { scale: drawn ? '1 1' : '0 1' }, drawn ? hoverSpring : leave);
  // Once settled, the stylesheet decides again, so a later route change still moves the line.
  if (!on) {
    void run.then(() => line.style.removeProperty('scale'));
  }
  return [run];
};
