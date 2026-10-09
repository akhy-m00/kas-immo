"use client";

import { useRef } from "react";
import Link from "next/link";
import { Filter, RotateCcw, Search } from "lucide-react";

import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
} from "@/lib/properties";

/**
 * Filtres de la liste des biens.
 *
 * Le formulaire est envoyé en `GET` : les filtres vivent dans l'URL, donc la
 * liste est filtrée par le serveur, la page reste partageable et le bouton
 * « retour » du navigateur fonctionne. Les menus déroulants valident et
 * envoient seuls, la recherche attend son bouton pour ne pas lancer une
 * requête à chaque frappe.
 */
type FiltresProps = {
  statut: string;
  type: string;
  transaction: string;
  recherche: string;
  /** `true` si au moins un filtre est actif : active le bouton « Réinitialiser ». */
  actif: boolean;
};

export function FiltresBiens({
  statut,
  type,
  transaction,
  recherche,
  actif,
}: FiltresProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      method="GET"
      action="/admin/biens"
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="filtre-statut"
            className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
          >
            Statut
          </label>
          <select
            id="filtre-statut"
            name="statut"
            defaultValue={statut}
            onChange={() => formRef.current?.requestSubmit()}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-brand-text focus-visible:ring-3 focus-visible:ring-brand-text/20"
          >
            <option value="">Tous les statuts</option>
            {PROPERTY_STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="filtre-type"
            className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
          >
            Type
          </label>
          <select
            id="filtre-type"
            name="type"
            defaultValue={type}
            onChange={() => formRef.current?.requestSubmit()}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-brand-text focus-visible:ring-3 focus-visible:ring-brand-text/20"
          >
            <option value="">Tous les types</option>
            {PROPERTY_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="filtre-transaction"
            className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
          >
            Transaction
          </label>
          <select
            id="filtre-transaction"
            name="transaction"
            defaultValue={transaction}
            onChange={() => formRef.current?.requestSubmit()}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-brand-text focus-visible:ring-3 focus-visible:ring-brand-text/20"
          >
            <option value="">Toutes</option>
            {TRANSACTION_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="filtre-recherche"
            className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
          >
            Titre
          </label>
          <div className="flex gap-2">
            <input
              id="filtre-recherche"
              type="search"
              name="recherche"
              defaultValue={recherche}
              placeholder="Rechercher…"
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
          href="/admin/biens"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-text underline-offset-4 hover:underline"
        >
          <RotateCcw aria-hidden="true" className="size-3.5" />
          Réinitialiser les filtres
        </Link>
      ) : (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter aria-hidden="true" className="size-3.5" />
          Tous les biens sont affichés.
        </p>
      )}
    </form>
  );
}
