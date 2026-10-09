"use client";

import { useRef } from "react";
import Link from "next/link";
import { Filter, RotateCcw, Search } from "lucide-react";

import { REQUEST_STATUSES, REQUEST_TYPES } from "@/lib/requests";

/**
 * Filtres de la liste des demandes.
 *
 * Même construction que `app/admin/biens/filtres.tsx`, volontairement : les
 * filtres vivent dans l'URL, la page reste partageable, et le filtrage est fait
 * par la base. Un administrateur peut donc envoyer le lien « En attente » à un
 * collègue, ce qui est précisément le cas d'usage du suivi d'une file de
 * demandes.
 *
 * Le menu « Statut » est aussi le raccourci principal : le tableau de bord renvoie
 * ici avec `?statut=nouveau`, donc la liste s'ouvre directement sur la file à
 * traiter.
 */
type FiltresProps = {
  statut: string;
  type: string;
  recherche: string;
  /** `true` si au moins un filtre est actif : active le bouton « Réinitialiser ». */
  actif: boolean;
};

export function FiltresDemandes({ statut, type, recherche, actif }: FiltresProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      method="GET"
      action="/admin/demandes"
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="filtre-statut-demande"
            className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
          >
            Statut
          </label>
          <select
            id="filtre-statut-demande"
            name="statut"
            defaultValue={statut}
            onChange={() => formRef.current?.requestSubmit()}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-brand-text focus-visible:ring-3 focus-visible:ring-brand-text/20"
          >
            <option value="">Tous les statuts</option>
            {REQUEST_STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="filtre-type-demande"
            className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
          >
            Type de demande
          </label>
          <select
            id="filtre-type-demande"
            name="type"
            defaultValue={type}
            onChange={() => formRef.current?.requestSubmit()}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-brand-text focus-visible:ring-3 focus-visible:ring-brand-text/20"
          >
            <option value="">Tous les types</option>
            {REQUEST_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="filtre-recherche-demande"
            className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
          >
            Demandeur
          </label>
          <div className="flex gap-2">
            <input
              id="filtre-recherche-demande"
              type="search"
              name="recherche"
              defaultValue={recherche}
              placeholder="Nom, e-mail ou téléphone…"
              className="h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-brand-text focus-visible:ring-3 focus-visible:ring-brand-text/20"
            />
            <button
              type="submit"
              aria-label="Rechercher"
              className="grid size-10 shrink-0 place-items-center rounded-lg border border-input bg-background transition-colors hover:bg-muted"
            >
              <Search aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {actif ? (
        <Link
          href="/admin/demandes"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-text underline-offset-4 hover:underline"
        >
          <RotateCcw aria-hidden="true" className="size-3.5" />
          Réinitialiser les filtres
        </Link>
      ) : (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter aria-hidden="true" className="size-3.5" />
          Toutes les demandes sont affichées.
        </p>
      )}
    </form>
  );
}