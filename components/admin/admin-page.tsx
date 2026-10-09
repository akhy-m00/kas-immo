import type { ReactNode } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";

import { SectionBadge } from "@/components/SectionBadge";
import { immobilierLogo } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Les trois entrées de l'espace admin, dans l'ordre d'usage. */
const RUBRIQUES = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/biens", label: "Biens" },
  { href: "/admin/demandes", label: "Demandes" },
  { href: "/admin/cleaning", label: "Cleaning" },
] as const;

/**
 * `true` si `href` est l'onglet courant, ou un de ses parents.
 *
 * Sans ce test, `/admin/biens/123` n'ouvrirait aucun onglet et
 * `/admin/biens` ouvrirait en plus « Tableau de bord », puisque ce dernier est
 * le parent de tous les autres.
 */
function estActif(href: string, courant: string): boolean {
  if (href === "/admin") return courant === "/admin";
  return courant === href || courant.startsWith(`${href}/`);
}

type AdminPageHeaderProps = {
  titre: string;
  sousTitre: string;
  /** Page courante, utilisée pour mettre en avant le bon onglet. */
  chemin: string;
  description?: string;
  actions?: ReactNode;
};

/**
 * En-tête commun aux pages de l'espace admin.
 *
 * Reprend la mise en page de `/mon-compte` — bandeau `bg-muted`, `SectionBadge`
 * sur carte — pour que l'administration appartienne visuellement au même site.
 */
export function AdminPageHeader({
  titre,
  sousTitre,
  chemin,
  description,
  actions,
}: AdminPageHeaderProps) {
  return (
    <section className="border-b border-border bg-muted">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <SectionBadge
          logo={immobilierLogo}
          titre={titre}
          sousTitre={sousTitre}
          surface="carte"
        />

        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          {description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          ) : (
            <span />
          )}

          {actions ? (
            <div className="flex flex-wrap gap-2">{actions}</div>
          ) : null}
        </div>

        <nav aria-label="Rubriques de l'administration" className="mt-8">
          <ul className="flex flex-wrap gap-1.5">
            {RUBRIQUES.map((rubrique) => {
              const actif = estActif(rubrique.href, chemin);

              return (
                <li key={rubrique.href}>
                  <Link
                    href={rubrique.href}
                    aria-current={actif ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                      actif
                        ? "bg-brand-text text-white"
                        : "text-muted-foreground hover:bg-border hover:text-foreground",
                    )}
                  >
                    {rubrique.label}
                    {actif ? (
                      <ChevronRight aria-hidden="true" className="size-3.5" />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </section>
  );
}

/**
 * Bloc de message posé après une écriture (succès, erreur).
 *
 * Le texte est fourni par l'URL plutôt que par un état client : il est ainsi
 * rendu dans le HTML de la page, présent sans JavaScript, et partageable.
 */
export function AdminNotice({
  ton,
  children,
}: {
  ton: "succes" | "erreur";
  children: ReactNode;
}) {
  return (
    <p
      role={ton === "erreur" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-4 py-3 text-sm font-medium",
        ton === "succes"
          ? "border-border bg-muted text-foreground"
          : "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      {children}
    </p>
  );
}

/** `metadata` commun aux pages admin, toutes hors indexation. */
export function adminMetadata(titre: string, description: string): Metadata {
  return {
    title: titre,
    description,
    // L'administration n'a rien à faire dans un moteur de recherche.
    robots: { index: false, follow: false },
  };
}
