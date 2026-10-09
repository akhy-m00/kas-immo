"use client";

import { useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import { ArrowUp } from "lucide-react";

import { BACK_TO_TOP_THRESHOLD_PX, DURATION, EASE_PRO } from "@/lib/animations";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Bouton « retour en haut », visible après 400 px de défilement.
 *
 * `scrollYProgress` est normalisé sur la hauteur du document : le seuil est
 * reconverti en pixels via `innerHeight` pour que le comportement soit
 * identique sur un document court et un document long.
 *
 * `AnimatePresence` retire l'élément du DOM une fois la sortie terminée.
 * En `prefers-reduced-motion` le bouton n'est pas rendu du tout : il n'apporte
 * rien au contenu.
 */
export function BackToTop() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const [shown, setShown] = useState(false);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const passed =
      latest * (document.documentElement.scrollHeight - window.innerHeight) >
      BACK_TO_TOP_THRESHOLD_PX;
    setShown((current) => (current === passed ? current : passed));
  });

  if (reduced) return null;

  return (
    <AnimatePresence>
      {shown ? (
        <motion.button
          type="button"
          aria-label="Revenir en haut de la page"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          initial={{ opacity: 0, scale: 0.8, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 12 }}
          transition={{ duration: DURATION.fast, ease: EASE_PRO }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          // Empilé AU-DESSUS du bouton WhatsApp flottant, qui occupe le coin
          // bas-droit en permanence, au même `z-40`. Sans ce décalage, les
          // deux boutons se superposeraient dès 400 px de défilement — le
          // second masquant le premier, ou l'inverse selon l'ordre du DOM.
          // Les valeurs reprennent la hauteur du bouton WhatsApp (56 px en
          // mobile, 64 px à partir de `sm`), plus sa marge basse et 12 px
          // d'air.
          className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-40 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift sm:right-6 sm:bottom-[calc(env(safe-area-inset-bottom)+6.5rem)]"
        >
          <ArrowUp aria-hidden="true" className="size-5" />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
