"use client";

import {
  Building2,
  Briefcase,
  DoorOpen,
  PackageOpen,
} from "lucide-react";

import {
  CLEANING_TYPES,
  CLEANING_TYPE_DESCRIPTIONS,
} from "@/lib/requests";
import type { CleaningType } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

/**
 * Les quatre types de nettoyage, en cartes radio.
 *
 * Un `<select>` aurait été plus court, mais il est mauvais sur mobile : il faut
 * l'ouvrir pour découvrir les options, sur un écran où la liste déroulante
 * native occupe une grande partie de l'écran, et le choix n'est visible qu'une
 * fois refermé. Ici les quatre options sont lisibles d'un coup d'œil, et chacune
 * est une cible d'environ 48 px de haut, confortable au doigt.
 *
 * Ce sont de VRAIS `input type="radio"`, pas des boutons stylés en
 * apparence : le clavier fait alors ce qu'on attend (les flèches parcourent le
 * groupe, Tab entre et sort du groupe), et un lecteur d'écran annonce « 2 sur 4 »
 * puis le nom de l'option.
 *
 * Le groupe est un `fieldset` dont la légende « Type de nettoyage » sert de
 * nom accessible, avec `required` porté par chaque input : la contrainte porte
 * sur le premier élément du groupe, ce qui est la seule façon de la faire
 * respecter au navigateur.
 */

const ICONES: Record<CleaningType, typeof Building2> = {
  appartement: DoorOpen,
  immeuble: Building2,
  bureau: Briefcase,
  apres_demenagement: PackageOpen,
};

type CleaningTypeFieldProps = {
  name: string;
  value: CleaningType | "";
  onValueChange: (value: CleaningType) => void;
  error?: string;
};

export function CleaningTypeField({
  name,
  value,
  onValueChange,
  error,
}: CleaningTypeFieldProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-foreground">
        Type de nettoyage
      </legend>

      <div
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-erreur` : undefined}
        className="grid gap-3 sm:grid-cols-2"
      >
        {CLEANING_TYPES.map((option) => {
          const Icone = ICONES[option.value];
          const selectionne = value === option.value;

          return (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                "focus-within:border-brand-text focus-within:ring-3 focus-within:ring-brand-text/20",
                selectionne
                  ? "border-brand-text bg-brand-soft"
                  : "border-border bg-card hover:border-brand-text/40",
              )}
            >
              {/* L'input est visuellement masqué mais jamais retiré du flux :
                  `sr-only` le laisse focusable et annonceable, ce que
                  `display: none` ferait perdre. Le focus est reporté sur le
                  label entier par `focus-within`. */}
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selectionne}
                onChange={() => onValueChange(option.value)}
                required
                className="sr-only"
              />

              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg",
                  selectionne
                    ? "bg-brand-text text-white"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icone className="size-4.5" />
              </span>

              <span className="flex min-w-0 flex-col gap-0.5">
                <span
                  className={cn(
                    "text-sm font-semibold",
                    selectionne ? "text-brand-text" : "text-foreground",
                  )}
                >
                  {option.label}
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {CLEANING_TYPE_DESCRIPTIONS[option.value]}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {error ? (
        <p
          id={`${name}-erreur`}
          role="alert"
          className="px-1 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}