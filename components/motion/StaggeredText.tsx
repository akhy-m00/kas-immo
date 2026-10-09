"use client";

import { AnimatePresence, motion } from "motion/react";

import {
  DURATION,
  EASE_PRO,
  fadeUp,
  wordFade,
  wordStaggerContainer,
} from "@/lib/animations";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

type StaggeredTextProps = {
  /** Le texte, découpé mot par mot. */
  text: string;
  className?: string;
  /** Fragmentation plus fine pour les titres courts. */
  perWord?: boolean;
  delay?: number;
};

/**
 * Titre dont les mots apparaissent l'un après l'autre.
 *
 * Chaque mot est un `span` en `inline-block` : c'est indispensable, un span
 * inline ne peut pas être transformé sans déformer la ligne. Le découpage
 * insère une espace insécable entre les mots pour qu'aucune coupure de ligne
 * ne se glisse entre deux fragments.
 */
export function StaggeredText({
  text,
  className,
  perWord = true,
  delay = 0,
}: StaggeredTextProps) {
  const reduced = useReducedMotion();
  const words = perWord ? text.split(" ") : [text];

  if (reduced) {
    return <span className={className}>{text}</span>;
  }

  return (
    <motion.span
      className={cn("inline", className)}
      variants={wordStaggerContainer}
      initial="hidden"
      animate="visible"
      transition={{ delayChildren: delay }}
    >
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="inline-block">
          {word}
          {index < words.length - 1 ? (
            <span className="inline-block">&nbsp;</span>
          ) : null}
        </span>
      ))}
    </motion.span>
  );
}

/**
 * Bloc du hero : titre mot par mot, puis sur-titre, description et boutons.
 * L'ordre est garanti par les délais, pas par des animations déclenchées au
 * survol, donc la séquence est reproductible.
 */
export function HeroSequence({
  eyebrow,
  title,
  description,
  actions,
  phone,
  className,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  actions: React.ReactNode;
  phone?: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div className={className}>
        {eyebrow}
        {title}
        {description}
        {actions}
        {phone}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
      }}
    >
      <motion.div variants={fadeUp}>{eyebrow}</motion.div>
      {title}
      <motion.div variants={fadeUp}>{description}</motion.div>
      <motion.div variants={fadeUp}>{actions}</motion.div>
      {phone ? <motion.div variants={fadeUp}>{phone}</motion.div> : null}
    </motion.div>
  );
}

export { wordFade, fadeUp, DURATION, EASE_PRO, AnimatePresence };
