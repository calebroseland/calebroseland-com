import { durations, eases } from '@crc/ui';
import { LazyMotion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

const loadFeatures = () => import('./motion/features.ts').then((mod) => mod.domAnimation);

/* `strict` makes the full `motion` component a runtime error, so the bundle cannot regress by accident.
   Reduced motion is honoured here for JS animation and in primitives.css for CSS transitions. */
export const MotionProvider = ({ children }: { children: ReactNode }) => {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig
        reducedMotion="user"
        transition={{ duration: durations.normal, ease: eases.out }}
      >
        {children}
      </MotionConfig>
    </LazyMotion>
  );
};
