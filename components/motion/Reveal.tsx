"use client";

import { motion, type Variants } from "motion/react";

import { EASE_PRO, DURATION, SCROLL_OFFSET_PX, fadeUp } from "@/lib/animations";
import { useReducedMotion } from "@/lib/use-reduced-motion";

type RevealProps = {
  children: React.ReactNode;
  /** Variante d'apparition. Par défaut un fondu avec glissement vers le haut. */
  variant?: Variants;
  /** Délai manuel, en secondes. Utile pour enchaîner après un autre bloc. */
  delay?: number;
  className?: string;
  /** Décalage de la zone de déclenchement. */
  margin?: string;
  /** Durée personnalisée, pour exceptions justifiées. */
  duration?: number;
  as?: "div" | "section" | "li" | "article";
};

/**
 * Apparition au scroll, jouée une seule fois.
 *
 * L'élément occupe sa place avant l'animation : seule `opacity` et `y` varient,
 * la hauteur est donc stable et le CLS nul.
 *
 * En `prefers-reduced-motion`, seul un fondu subsiste, sans déplacement.
 */
export function Reveal({
  children,
  variant,
  delay,
  className,
  margin = `${SCROLL_OFFSET_PX}px`,
  duration,
  as = "div",
}: RevealProps) {
  const reduced = useReducedMotion();
  const Component = motion[as];
  const source = variant ?? fadeUp;

  // `visible` peut être une fonction (résolveur) : on n'en lit jamais la
  // transition dans ce cas, on la reconstruit entièrement.
  const sourceHidden = typeof source.hidden === "object" ? source.hidden : {};
  const sourceVisible =
    typeof source.visible === "object" ? source.visible : {};

  const baseTransition =
    typeof sourceVisible.transition === "object"
      ? sourceVisible.transition
      : {};

  const variants: Variants = reduced
    ? {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { duration: duration ?? DURATION.fast },
        },
      }
    : {
        hidden: sourceHidden,
        visible: {
          ...sourceVisible,
          transition: {
            ...baseTransition,
            ...(duration ? { duration } : {}),
            ...(delay ? { delay } : {}),
            ease: EASE_PRO,
          },
        },
      };

  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin }}
      variants={variants}
    >
      {children}
    </Component>
  );
}
