"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * `false` au rendu serveur **et** au premier rendu client, `true` ensuite.
 *
 * Sert de garde-fou d'hydratation : tout calcul qui dépend de `window` doit
 * être neutralisé tant que ce drapeau est faux, sinon le style rendu par le
 * serveur diffère de celui du client et React laisse l'écart en place.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** `true` sous 768 px. `false` au rendu serveur. */
export function useIsNarrow(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.innerWidth < 768,
    () => false,
  );
}
