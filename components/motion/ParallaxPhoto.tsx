"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "motion/react";

import { PARALLAX_DISTANCE } from "@/lib/animations";
import { useIsNarrow, useMounted } from "@/lib/use-mounted";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

type ParallaxPhotoProps = {
  children: React.ReactNode;
  className?: string;
  /** Distance de déplacement en pixels sur ordinateur. */
  distance?: number;
};

/**
 * Parallaxe douce sur une photo de fond.
 *
 * Le déplacement vient d'un `useScroll` borné au conteneur : quand la photo
 * entre par le bas, `offset` vaut -1 ; quand elle sort par le haut, +1. La
 * transformation va de `-distance` à `+distance`, donc la photo glisse
 * toujours plus lentement que le contenu.
 *
 * Sur mobile la distance est divisée par 4.5 et sur `prefers-reduced-motion`
 * l'effet est totalement coupé. Seuls `y` et `scale` sont animés, donc le
 * document ne change pas de hauteur et le CLS reste nul.
 */
export function ParallaxPhoto({
  children,
  className,
  distance = PARALLAX_DISTANCE.desktop,
}: ParallaxPhotoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const isNarrow = useIsNarrow();

  /**
   * `mounted` vaut `false` côté serveur **et** au premier rendu client. La
   * largeur de la fenêtre n'étant connue qu'après hydratation, la lire pendant
   * le rendu produirait un style calculé au serveur mais pas au client : React
   * signalerait un écart d'attribut et ne le corrigerait pas. Tant que
   * `mounted` est faux, le style est neutre des deux côtés, puis la parallaxe
   * s'établit au premier frame.
   */
  const mounted = useMounted();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const smooth = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 28,
    restDelta: 0.001,
  });

  const travel = !mounted || reduced ? 0 : isNarrow ? distance / 4.5 : distance;
  // Léger zoom permanent : sans lui, la parallaxe fait entrer les bords
  // Schwartz de l'image dans la section.
  const scale = useTransform(smooth, [0, 1], [1.08, 1.08]);
  const y = useTransform(smooth, [0, 1], [-travel, travel]);

  return (
    <div
      ref={ref}
      className={cn("absolute inset-0 overflow-hidden", className)}
    >
      <motion.div
        className="absolute inset-0"
        style={{ y, scale, transformOrigin: "center" }}
      >
        {children}
      </motion.div>
    </div>
  );
}
