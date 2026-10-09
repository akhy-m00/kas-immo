"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Détecte `prefers-reduced-motion`.
 *
 * Renvoie toujours `false` pendant le rendu serveur pour que le HTML servi et
 * le premier rendu client soient identiques. Sans cela, un visiteur ayant
 * « réduire les animations » recevrait un balisage différent de celui attendu
 * par l'hydratation et React signalerait un écart.
 *
 * `useSyncExternalStore` évite un `setState` dans un effet : la valeur est lue
 * au moment du rendu, donc il n'y a jamais d'image intermédiaire « animé »
 * suivie d'une correction.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}
