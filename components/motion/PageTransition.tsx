"use client";

import { motion } from "motion/react";

import { DURATION, EASE_PRO } from "@/lib/animations";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Enveloppe de transition entre deux pages.
 *
 * Placée dans `app/template.tsx`, elle est remontée à chaque changement de
 * route par l'App Router, ce qui rejoue l'animation sans rechargement.
 *
 * Le fond est repris du thème via une classe CSS, pas une couleur en dur : le
 * rendu est identique avant et après l'hydratation, donc pas de flash blanc
 * en mode sombre. Seule l'opacité et un léger `y` sont animés.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.fast, ease: EASE_PRO }}
    >
      {children}
    </motion.div>
  );
}
