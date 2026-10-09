"use client";

import { useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";

import { cn } from "@/lib/utils";

/** Seuil au-delà duquel le fond flou et l'ombre apparaissent. */
const BLUR_THRESHOLD = 20;

/**
 * Header toujours visible en haut de l'écran, quel que soit le sens du
 * défilement.
 *
 * `sticky` plutôt que `fixed` : le header conserve sa place dans le flux, donc
 * aucun spacer ni padding compensatoire n'est nécessaire sur `main` — le
 * contenu ne peut pas se retrouver masqué. Les ancres internes restent justes
 * aussi, car `SmoothScroll` les décale déjà de 80 px.
 *
 * Il ne se cache plus au défilement ; seul l'effet de fond subsiste : au-delà
 * de 20 px, la barre floutée et son ombre signalent qu'il y a du contenu
 * derrière elle, tout en restant toujours atteignable au doigt comme à la
 * souris.
 */
export function AnimatedSiteHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const next = Math.max(0, latest) > BLUR_THRESHOLD;
    setScrolled((current) => (current === next ? current : next));
  });

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur-md transition-shadow",
        scrolled
          ? "border-border bg-background/85 shadow-soft"
          : "border-transparent bg-background",
      )}
    >
      {children}
    </header>
  );
}