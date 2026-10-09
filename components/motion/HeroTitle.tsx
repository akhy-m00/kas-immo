"use client";

import { motion } from "motion/react";

import { DURATION, EASE_PRO, wordFade } from "@/lib/animations";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

type HeroTitleProps = {
  /** Première ligne, rendue telle quelle. */
  line1: string;
  /** Deuxième ligne, dont les mots `highlight` sont colorés. */
  line2: { text: string; highlight?: boolean }[];
  tail?: string;
  className?: string;
};

/**
 * Titre du hero : apparition mot par mot, les mots colorés restant au même
 * endroit dans la séquence.
 *
 * L'espace insécable entre deux mots évite qu'un retour à la ligne s'insère
 * au milieu d'un fragment `inline-block` et ne décale la ligne.
 */
export function HeroTitle({ line1, line2, tail, className }: HeroTitleProps) {
  const reduced = useReducedMotion();

  const words = [
    { text: line1, highlight: false },
    ...line2,
    ...(tail ? [{ text: tail, highlight: false }] : []),
  ];

  if (reduced) {
    return (
      <h1 className={className}>
        {line1}
        <br />
        {line2.map((word, index) => (
          <span key={word.text}>
            {index > 0 ? " " : ""}
            {word.highlight ? (
              <span className="text-brand-300">{word.text}</span>
            ) : (
              word.text
            )}
          </span>
        ))}
        {tail ? ` ${tail}` : ""}
      </h1>
    );
  }

  return (
    <h1 className={className}>
      <motion.span
        className="inline"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.05, delayChildren: 0.08 },
          },
        }}
      >
        {words.map((word, index) => (
          <motion.span
            key={`${word.text}-${index}`}
            className="inline-block"
            variants={wordFade}
            transition={{ duration: DURATION.fast, ease: EASE_PRO }}
          >
            {word.highlight ? (
              <span className={cn("text-brand-300")}>{word.text}</span>
            ) : (
              word.text
            )}
            {index < words.length - 1 ? (
              <span className="inline-block">&nbsp;</span>
            ) : null}
          </motion.span>
        ))}
      </motion.span>
    </h1>
  );
}
