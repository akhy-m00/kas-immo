import type { Transition, Variants } from "motion/react";

/**
 * Rythme commun à toutes les animations du site.
 * Le easing [0.22, 1, 0.36, 1] est une courbe exponentielle douce : sortie
 * rapide, arrivée longue. C'est la signature visuelle du site.
 */
export const EASE_PRO = [0.22, 1, 0.36, 1] as const;
export const EASE_OUT_SOFT = [0.16, 1, 0.3, 1] as const;

/** Durées normalisées. Toute animation du site utilise une de ces trois valeurs. */
export const DURATION = {
  /** Micro-retour tactile : survol, appui, icône. */
  fast: 0.4,
  /** Durée par défaut des apparitions au scroll. */
  base: 0.55,
  /** Décors plus amples : parallaxe, compteurs, accordéon. */
  slow: 0.7,
} as const;

export const SPRING = {
  /** Ressort discret pour les panneaux et l'accordéon. */
  panel: { type: "spring", stiffness: 320, damping: 34, mass: 0.9 },
  /** Ressort très amorti pour les indicateurs de navigation. */
  indicator: { type: "spring", stiffness: 380, damping: 32 },
} as const;

/** Transition standard : une seule durée, un seul easing. */
export const T_STANDARD: Transition = {
  duration: DURATION.base,
  ease: EASE_PRO,
};

/** Décalage entre deux éléments d'une grille ou d'une liste. */
export const STAGGER = 0.08;

/**
 * Apparition en fondu avec glissement vers le haut.
 * `y` reste faible (18px) : au-delà, l'œil perçoit un glissement et non une
 * apparition.
 */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE_PRO },
  },
};

/** Fondu pur, sans déplacement. Pour le texte dense et les petits éléments. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.base, ease: EASE_PRO },
  },
};

/** Apparition avec léger agrandissement. Pour les logos et les badges. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.base, ease: EASE_PRO },
  },
};

/**
 * Apparition d'une photo : fondu accompagné d'un très léger zoom progressif.
 * Le zoom part de 0.96 — au-delà, l'œil perçoit un « pop » plutôt qu'une mise
 * au point. La durée est celle des décors amples pour un effet posé.
 */
export const zoomFade: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.slow, ease: EASE_PRO },
  },
};

/**
 * Conteneur qui enchaîne ses enfants.
 * `staggerChildren` est modulé par `staggerChildren: 0.08` et non une valeur
 * codée en dur ici, pour que chaque appel reste lisible.
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: STAGGER, delayChildren: 0.04 },
  },
};

/** Variante du conteneur pour un titre dont chaque mot apparaît séparément. */
export const wordStaggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.045, delayChildren: 0.08 },
  },
};

/** Chaque mot du titre. */
export const wordFade: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.fast, ease: EASE_PRO },
  },
};

/** Variante de l'accordéon : `height` est animé par la bibliothèque, pas par CSS. */
export const accordion: Variants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: { duration: DURATION.slow, ease: EASE_PRO },
  },
};

/** Sortie de l'accordéon : plus vive que l'entrée pour rester réactif. */
export const accordionExit: Variants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: { duration: DURATION.fast, ease: EASE_PRO },
  },
};

/** Entrée / sortie de la barre de retour en haut. */
export const backToTop: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: DURATION.fast, ease: EASE_PRO },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 12,
    transition: { duration: DURATION.fast, ease: EASE_PRO },
  },
};

/**
 * Décalage du défilement pour revealed sous le header.
 * Le header fait 64-80px selon la largeur, 80px laisse une marge confortable.
 */
export const SCROLL_OFFSET_PX = -80;

/** Seuil au-delà duquel le bouton « retour en haut » apparaît. */
export const BACK_TO_TOP_THRESHOLD_PX = 400;

/** Distance de parallaxe en pixels, desktop puis mobile (réduit). */
export const PARALLAX_DISTANCE = { desktop: 64, mobile: 14 } as const;
