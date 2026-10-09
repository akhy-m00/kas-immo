"use client";

import { usePathname } from "next/navigation";
import { motion } from "motion/react";

import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { DURATION, EASE_PRO } from "@/lib/animations";
import { immobilierContact } from "@/lib/site";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Bouton WhatsApp flottant, présent sur toutes les pages publiques.
 *
 * Un seul montage, dans `app/layout.tsx` : l'ajouter page par page laisserait
 * passer une page oubliée, et le placer dans les deux layouts imbriqués le
 * dupliquerait sur l'administration.
 *
 * `position: fixed` — le bouton ne dépend d'aucun conteneur, donc il reste
 * collé à l'écran quel que soit le défilement, y compris sur les documents
 * très longs où un `sticky` passerait sous le footer.
 */
export function FloatingWhatsApp() {
  const reduced = useReducedMotion();
  const pathname = usePathname();

  // L'administration garde la main : ses écrans sont denses, et un bouton
  // flottant y masquerait le tableau ou le formulaire de demandes. Le chemin
  // est comparé sur son segment, pas sur `startsWith`, afin qu'une route
  // comme `/administrateur` ne soit pas concernée par hasard.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;

  return (
    <motion.a
      href={immobilierContact.whatsapp.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contacter KAS Immo sur WhatsApp"
      title="Contacter KAS Immo sur WhatsApp"
      // Le tooltip `title` n'apparaît qu'au survol de la souris, absent des
      // claviers et des téléphones ; l'`aria-label` ci-dessus porte donc seul
      // l'accessibilité, et le doublon ne gêne pas.
      initial={reduced ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: DURATION.base, ease: EASE_PRO }}
      whileHover={reduced ? undefined : { scale: 1.06 }}
      whileTap={reduced ? undefined : { scale: 0.94 }}
      className={
        "fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] z-40 " +
        "flex size-14 items-center justify-center rounded-full " +
        // Vert officiel WhatsApp (#25D366) avec glyphe blanc : contraste
        // élevé et reconnaissance immédiate de la messagerie, en clair comme
        // en sombre. Le survol assombrit légèrement le vert, et le focus
        // dessine un anneau vert foncé visible sur les deux thèmes. La classe
        // de couleur est appliquée sur le lien lui-même : aucun jeton de thème
        // ne peut la surcharger.
        "bg-[#25D366] text-white " +
        "shadow-[0_10px_30px_-8px_rgba(37,211,102,0.55)] " +
        "transition-colors hover:bg-[#1EBE5B] " +
        "focus-visible:ring-2 focus-visible:ring-[#128C7E] focus-visible:ring-offset-2 focus-visible:outline-none " +
        // `env(safe-area-inset-bottom)` : nul sur ordinateur et sur les
        // téléphones sans encoche, mais vaut une trentaine de pixels sur un
        // iPhone à barre d'accueil. Sans lui, le bouton chevaucherait la barre
        // du système. `viewportFit: "cover"` est déjà déclaré dans
        // `app/layout.tsx` — sans lui, la variable vaut toujours zéro.
        "sm:right-6 sm:bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:size-16"
      }
    >
      <WhatsAppIcon className="size-7 sm:size-8" />
    </motion.a>
  );
}