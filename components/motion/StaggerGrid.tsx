"use client";

import { motion } from "motion/react";

import {
  DURATION,
  SCROLL_OFFSET_PX,
  STAGGER,
  fadeUp,
  staggerContainer,
} from "@/lib/animations";
import { useReducedMotion } from "@/lib/use-reduced-motion";

type StaggerGridProps = {
  children: React.ReactNode;
  className?: string;
  /** Classes appliquées à chaque enfant pour qu'ils restent symétriques. */
  itemClassName?: string;
  /** Écart entre deux enfants. */
  stagger?: number;
  margin?: string;
};

/**
 * Grille dont les enfants arrivent l'un après l'autre au scroll.
 *
 * Le conteneur porte les variantes `staggerContainer`, chaque enfant porte
 * `fadeUp` : la bibliothèque propage l'état du parent aux enfants, il n'y a
 * donc pas N `whileInView` indépendants qui se déclencheraient au même instant.
 */
export function StaggerGrid({
  children,
  className,
  itemClassName,
  stagger = STAGGER,
  margin = `${SCROLL_OFFSET_PX}px`,
}: StaggerGridProps) {
  const reduced = useReducedMotion();
  const items = Array.isArray(children) ? children : [children];

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin }}
      variants={
        reduced
          ? {
              hidden: {},
              visible: {
                transition: { staggerChildren: stagger * 0.5 },
              },
            }
          : staggerContainer
      }
    >
      {items.map((child, index) => (
        <motion.div
          key={index}
          className={itemClassName}
          variants={
            reduced
              ? {
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { duration: DURATION.fast },
                  },
                }
              : fadeUp
          }
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
