import type { Variants } from "framer-motion";

export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const DUR = 0.72;

export const VP = { once: true, margin: "-60px" } as const;

/** Hero sections — stagger children on mount */
export const heroContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

export const heroItem: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: DUR, ease: EASE } },
};

/** Scroll sections — stagger children whileInView */
export const scrollContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: DUR, ease: EASE } },
};

/** Divider lines — scaleX sweep from left */
export const dividerLine: Variants = {
  hidden: { scaleX: 0, originX: 0 },
  show: { scaleX: 1, originX: 0, transition: { duration: DUR, ease: EASE } },
};
