"use client";

import { motion } from "motion/react";

import { DURATION, SPRING, fadeUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";

/**
 * Icône burger qui se transforme en croix.
 *
 * Les trois barres sont en CSS pur. Celle du milieu disparaît, celle du haut
 * descend en diagonale, celle du bas monte. Seules `transform` et `opacity`
 * varient, donc le bouton ne change jamais de taille.
 */
export function BurgerIcon({
  open,
  className,
}: {
  open: boolean;
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={cn("relative block size-5", className)}>
      <motion.span
        className="absolute top-0 left-0 block h-0.5 w-5 rounded-full bg-current"
        animate={open ? { y: 9, rotate: 45 } : { y: 0, rotate: 0 }}
        transition={{ duration: DURATION.fast, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.span
        className="absolute top-1/2 left-0 block h-0.5 w-5 -translate-y-1/2 rounded-full bg-current"
        animate={open ? { opacity: 0, scaleX: 0.2 } : { opacity: 1, scaleX: 1 }}
        transition={{ duration: DURATION.fast, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.span
        className="absolute bottom-0 left-0 block h-0.5 w-5 rounded-full bg-current"
        animate={open ? { y: -9, rotate: -45 } : { y: 0, rotate: 0 }}
        transition={{ duration: DURATION.fast, ease: [0.22, 1, 0.36, 1] }}
      />
    </span>
  );
}

/**
 * Liens du menu mobile, arrivals en cascade.
 *
 * Le conteneur porte `staggerContainer` et chaque lien un `fadeUp` : la
 * bibliothèque propage l'état du parent aux enfants, un seul déclencheur
 * suffit donc à sequenced toute la liste.
 */
export function MobileNavLinks({ children }: { children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];

  return (
    <motion.nav
      aria-label="Navigation mobile"
      className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      transition={SPRING.panel}
    >
      {items.map((child, index) => (
        <motion.div key={index} variants={fadeUp}>
          {child}
        </motion.div>
      ))}
    </motion.nav>
  );
}
