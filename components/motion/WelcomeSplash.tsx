"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { ThemedLogo } from "@/components/ThemedLogo";
import { DURATION, EASE_PRO } from "@/lib/animations";
import { immobilierLogo } from "@/lib/site";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const STORAGE_KEY = "kas-splash-v1";

/** Durée pendant laquelle l'écran reste opaque, avant son fondu de sortie. */
const HOLD_MS = 900;

/**
 * Écran de bienvenue, une fois par session.
 *
 * Le contenu est rendu derrière dès le départ et le voile est
 * `pointer-events-none` : cet écran ne peut pas empêcher l'accès au site. Il
 * est `aria-hidden` et retiré du DOM après sa sortie.
 *
 * En `prefers-reduced-motion` il n'est jamais affiché.
 */
export function WelcomeSplash() {
  const reduced = useReducedMotion();
  // Initialisé à `false` pour que le HTML servi ne contienne aucun voile : un
  // écran de chargement dans le HTML initial bloquerait le contenu avant même
  // l'exécution de JavaScript.
  const [phase, setPhase] = useState<"idle" | "visible" | "leaving">("idle");

  useEffect(() => {
    if (reduced) return;
    if (typeof window === "undefined") return;

    let alreadySeen = false;
    try {
      alreadySeen = window.sessionStorage.getItem(STORAGE_KEY) === "1";
      if (!alreadySeen) {
        // Marqué avant l'affichage : un rechargement pendant le fondu ne
        // rejoue pas l'écran.
        window.sessionStorage.setItem(STORAGE_KEY, "1");
      }
    } catch {
      // Stockage indisponible (navigation privée) : on montre l'écran une fois.
      alreadySeen = false;
    }

    if (alreadySeen) return;

    // `setTimeout(0)` plutôt qu'un `setState` direct : React 19 interdit un
    // setState synchrone dans un effet, il provoquerait un rendu en cascade.
    const show = window.setTimeout(() => setPhase("visible"), 0);
    const leave = window.setTimeout(() => setPhase("leaving"), HOLD_MS);
    const remove = window.setTimeout(
      () => setPhase("idle"),
      HOLD_MS + DURATION.fast * 1000,
    );

    return () => {
      window.clearTimeout(show);
      window.clearTimeout(leave);
      window.clearTimeout(remove);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <AnimatePresence>
      {phase !== "idle" ? (
        <motion.div
          key="splash"
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-100 flex items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          animate={{ opacity: phase === "leaving" ? 0 : 1 }}
          transition={{ duration: DURATION.fast, ease: EASE_PRO }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: DURATION.slow, ease: EASE_PRO }}
          >
            <ThemedLogo
              logo={immobilierLogo}
              className="h-16 w-auto object-contain sm:h-20"
            />
          </motion.div>

          <motion.div
            className="absolute bottom-0 left-0 h-[3px] w-full origin-left bg-brand-600"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
