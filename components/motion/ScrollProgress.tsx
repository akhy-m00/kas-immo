"use client";

import { motion, useScroll, useSpring } from "motion/react";

import { DURATION, EASE_PRO } from "@/lib/animations";

/**
 * Barre de progression de lecture, en haut de la fenêtre.
 *
 * `scaleX` est la seule propriété animée : la largeur réelle reste à 100 %, donc
 * la barre ne provoque aucun reflux de mise en page. `transformOrigin: left`
 * fait croître la barre depuis le bord gauche.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 26,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-[#8E0B3F]"
    />
  );
}

export const SCROLL_PROGRESS_TRANSITION = {
  duration: DURATION.fast,
  ease: EASE_PRO,
};
