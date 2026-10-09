"use client";

import { motion, useReducedMotion } from "motion/react";

import { fadeUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";

/**
 * Squelettes animés pour les futurs blocs de biens.
 *
 * L'effet de brillance est un `translateX` de -100 % à 100 % sur une bande
 * translucide : seules la transform et l'opacité sont animées, donc 60 fps
 * sans recalcul de mise en page.
 *
 * Les hauteurs sont fixées en classes, donc la page ne se décale pas quand les
 * données arrivent.
 */
export function Skeleton({ className }: { className?: string }) {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted dark:bg-card",
        className,
      )}
    >
      {/*
        La brillance ne tourne que lorsque le squelette est à l'écran, et
        s'arrête avec `prefers-reduced-motion`. Sans cela, six cartes en attente
        forceraient le navigateur à recomposer en boucle même après que
        l'utilisateur a fait défiler au-delà.
      */}
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-transparent via-ink-100/70 to-transparent dark:via-ink-800/70"
        initial={{ x: "-100%", opacity: 0 }}
        whileInView={{ x: "100%", opacity: [0, 1, 0] }}
        viewport={{ once: false, margin: "80px" }}
        transition={
          reduced
            ? { duration: 0 }
            : {
                duration: 1.6,
                ease: "linear",
                repeat: Infinity,
                repeatDelay: 0.4,
              }
        }
      />
    </div>
  );
}

/**
 * Groupe de cartes squelettes, reproduisant la future grille de biens.
 * `count` cartes par ligne sur ordinateur, une colonne sur mobile.
 */
export function PropertySkeletons({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Chargement des biens"
      className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-3", className)}
    >
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-3 rounded-2xl border border-border p-4"
        >
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <motion.div variants={fadeUp} className="flex flex-col gap-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </motion.div>
        </motion.div>
      ))}
      <span className="sr-only">Chargement en cours…</span>
    </div>
  );
}
