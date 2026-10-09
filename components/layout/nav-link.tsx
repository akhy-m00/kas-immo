"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";

import { SPRING } from "@/lib/animations";
import { cn } from "@/lib/utils";

type NavLinkProps = {
  href: string;
  label: string;
  onNavigate?: () => void;
  className?: string;
  /** Affiche l'indicateur animé sous le lien. */
  showIndicator?: boolean;
};

/**
 * Lien de navigation avec soulignement bordeaux qui glisse au survol.
 *
 * L'indicateur de page active utilise `layoutId` : c'est le même élément
 * déplacé d'un lien à l'autre quand la navigation change, ce qui produit un
 * travelling continu plutôt qu'une apparition/disparition.
 */
export function NavLink({
  href,
  label,
  onNavigate,
  className,
  showIndicator = true,
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group/nav relative font-heading text-[0.95rem] font-semibold tracking-tight transition-colors",
        "hover:text-brand-text focus-visible:text-brand-text",
        // Cible tactile confortable sur mobile, sans changer le rendu sur ordinateur.
        "flex min-h-11 items-center",
        isActive ? "text-brand-text" : "text-foreground",
        className,
      )}
    >
      {label}

      {/* Soulignement qui se déploie depuis la gauche au survol. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-brand-text transition-transform duration-300 ease-out",
          "group-hover/nav:scale-x-100 group-focus-visible/nav:scale-x-100",
          isActive && "scale-x-100",
        )}
      />

      {/* Indicateur animé de la page active, partagé entre les liens. */}
      {showIndicator && isActive ? (
        <motion.span
          layoutId="nav-active-indicator"
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-text"
          transition={SPRING.indicator}
        />
      ) : null}
    </Link>
  );
}
