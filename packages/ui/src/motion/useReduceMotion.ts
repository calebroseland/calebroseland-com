import { useReducedMotion } from 'motion/react';

/** Whether the visitor asked for reduced motion, as a plain boolean. */
export const useReduceMotion = (): boolean => {
  return useReducedMotion() ?? false;
};
