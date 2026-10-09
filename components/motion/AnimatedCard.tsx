"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { motion } from "motion/react";

import { DURATION, EASE_PRO, fadeUp } from "@/lib/animations";
import { cn } from "@/lib/utils";

/**
 * L'état de survol est partagé par contexte plutôt que propagé par `variants` :
 * la photo à zoomer est rendue par un composant intermédiaire
 * (`BackgroundSection`), donc elle n'est pas un enfant `motion` direct de la
 * carte et ne recevrait pas la variante.
 */
const HoverContext = createContext(false);

type AnimatedCardProps = {
  children: ReactNode;
  className?: string;
  /** Désactive le survol. Utilisé sur les zones sans photo. */
  interactive?: boolean;
  variant?: typeof fadeUp;
  as?: "div" | "article" | "li";
};

/**
 * Carte qui se soulève de 6 px au survol, l'image qu'elle contient zoomant
 * légèrement pour donner de la profondeur.
 *
 * Sur écran tactile il n'y a pas de survol : seul `whileTap` répond, ce qui
 * évite un état « survolé » collé après un appui.
 */
export function AnimatedCard({
  children,
  className,
  interactive = true,
  variant = fadeUp,
  as = "div",
}: AnimatedCardProps) {
  const [hovered, setHovered] = useState(false);
  const Component = motion[as];

  return (
    <HoverContext.Provider value={hovered}>
      <Component
        className={cn("group/card relative overflow-hidden", className)}
        variants={variant}
        whileHover={interactive ? { y: -6 } : undefined}
        onHoverStart={interactive ? () => setHovered(true) : undefined}
        onHoverEnd={interactive ? () => setHovered(false) : undefined}
        whileTap={interactive ? { y: -2, scale: 0.99 } : undefined}
        transition={{ duration: DURATION.fast, ease: EASE_PRO }}
      >
        {children}
      </Component>
    </HoverContext.Provider>
  );
}

/**
 * Enveloppe de la photo d'une carte : elle est agrandie de 5 % pendant que la
 * carte est survolée. L'`overflow-hidden` de la carte la tronque.
 *
 * `relative` est indispensable : une image `fill` se positionne par rapport à
 * son parent direct. Sans lui, l'image se positionne sur le conteneur de la
 * carte, l'agrandissement ne s'applique pas à la photo, et Next.js signale un
 * parent en `position: static`.
 */
export function PhotoZoom({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const hovered = useContext(HoverContext);

  return (
    <motion.div
      className={cn("relative h-full w-full", className)}
      animate={{ scale: hovered ? 1.05 : 1 }}
      transition={{ duration: DURATION.slow, ease: EASE_PRO }}
      style={{ transformOrigin: "center" }}
    >
      {children}
    </motion.div>
  );
}
