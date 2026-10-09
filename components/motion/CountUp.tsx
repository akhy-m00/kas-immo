"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

import { DURATION, EASE_PRO } from "@/lib/animations";

type CountUpProps = {
  /** Valeur finale affichée. */
  value: number;
  /** Suffixe collé au nombre, ex. `+` ou `%`. */
  prefix?: string;
  suffix?: string;
  className?: string;
  /** Durée du comptage. */
  duration?: number;
};

/**
 * Compteur qui s'incrémente jusqu'à sa valeur quand il entre à l'écran.
 *
 * L'état est initialisé à `value`, pas à 0 : le premier rendu affiche donc
 * déjà le bon nombre. L'animation ne replace la valeur que lorsque
 * `useInView` bascule, et comme `initial` est passé à `value`, l'hydratation
 * n'introduit jamais d'écart visuel.
 *
 * `tabular-nums` réserve la largeur : les chiffres ne font pas sauter le texte
 * voisin pendant le comptage.
 */
export function CountUp({
  value,
  prefix = "",
  suffix = "",
  className,
  duration = DURATION.slow * 2,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (reduced) return;
    if (!inView) return;

    const controls = animate(0, value, {
      duration,
      ease: EASE_PRO,
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });

    return () => controls.stop();
  }, [inView, value, duration, reduced]);

  return (
    <span
      ref={ref}
      className={className}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
