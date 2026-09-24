import { useReducedMotion } from "motion/react";

/** Whether the visitor asked for reduced motion, as a plain boolean. */
export function useReduceMotion(): boolean {
  return useReducedMotion() ?? false;
}
