"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FloatingField } from "@/components/motion/FloatingField";
import { OPTIONS_TYPE, OPTIONS_TRANSACTION } from "@/lib/properties-public";
import type { CatalogueFiltres } from "@/lib/properties-public";

/**
 * Filtres du catalogue.
 *
 * Tout passe par l'URL (`GET`) et non par un état local : une recherche reste
 * partageable, rechargeable et indexable, et la page reste rendue côté serveur.
 *
 * Le formulaire n'est pas soumis par l'appui sur « Entrée » : les filtres
 * s'appliquent dès qu'ils changent, avec un court délai sur la seule recherche
 * textuelle, pour ne pas relancer une requête à chaque lettre frappée.
 */

type CatalogueFiltresProps = {
  filtres: CatalogueFiltres;
  /** Nombre de biens affichés, pour « X biens trouvés ». */
  total: number;
  /** Vrai si des filtres sont actifs, pour proposer la réinitialisation. */
  actifs: boolean;
};

const DELAI_RECHERCHE_MS = 350;

export function CatalogueFiltres({
  filtres,
  total,
  actifs,
}: CatalogueFiltresProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [enAttente, demarrer] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [recherche, setRecherche] = useState(filtres.recherche ?? "");
  const [ouvert, setOuvert] = useState(false);

  // Le composant survit à un changement d'URL (retour arrière, lien partagé) :
  // le champ doit alors refléter la nouvelle valeur sans être réinitialisé.
  const rechercheUrl = searchParams.get("recherche") ?? "";
  const [derniereRechercheUrl, setDerniereRechercheUrl] =
    useState(rechercheUrl);

  if (rechercheUrl !== derniereRechercheUrl) {
    setDerniereRechercheUrl(rechercheUrl);
    setRecherche(rechercheUrl);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function construireURL(modifications: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [cle, valeur] of Object.entries(modifications)) {
      if (valeur === null || valeur === "") {
        params.delete(cle);
      } else {
        params.set(cle, valeur);
      }
    }

    const chaine = params.toString();
    return chaine ? `/immobilier?${chaine}` : "/immobilier";
  }

  function appliquer(modifications: Record<string, string | null>) {
    demarrer(() => {
      router.push(construireURL(modifications));
    });
  }

  function changerTexte(cle: string, valeur: string) {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      appliquer({ [cle]: valeur.trim() || null });
    }, DELAI_RECHERCHE_MS);
  }

  function reinitialiser() {
    setRecherche("");
    appliquer({
      transaction: null,
      type: null,
      prixMin: null,
      prixMax: null,
      recherche: null,
      indisponibles: null,
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <form onSubmit={(event) => event.preventDefault()} className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <FloatingField
            id="recherche-bien"
            label="Rechercher un bien"
            type="search"
            value={recherche}
            onValueChange={(valeur) => {
              setRecherche(valeur);
              changerTexte("recherche", valeur);
            }}
          />

          <Button
            type="button"
            variant="outline"
            className="h-11 gap-2 sm:w-auto"
            onClick={() => setOuvert((valeur) => !valeur)}
            aria-expanded={ouvert}
            aria-controls="filtres-advanced"
          >
            <SlidersHorizontal aria-hidden="true" />
            Filtres
            {actifs ? (
              <span
                className="ml-1 size-1.5 rounded-full bg-primary"
                aria-hidden="true"
              />
            ) : null}
          </Button>
        </div>

        <div
          id="filtres-advanced"
          hidden={!ouvert}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">
              Type de transaction
            </span>
            <select
              name="transaction"
              defaultValue={filtres.transaction ?? ""}
              onChange={(event) =>
                appliquer({ transaction: event.target.value || null })
              }
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="">Toutes</option>
              {OPTIONS_TRANSACTION.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Type de bien</span>
            <select
              name="type"
              defaultValue={filtres.type ?? ""}
              onChange={(event) =>
                appliquer({ type: event.target.value || null })
              }
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="">Tous</option>
              {OPTIONS_TYPE.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">
              Prix minimum (FCFA)
            </span>
            <input
              type="number"
              name="prixMin"
              inputMode="numeric"
              min={0}
              defaultValue={filtres.prixMin ?? ""}
              placeholder="0"
              onChange={(event) =>
                appliquer({ prixMin: event.target.value || null })
              }
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">
              Prix maximum (FCFA)
            </span>
            <input
              type="number"
              name="prixMax"
              inputMode="numeric"
              min={0}
              defaultValue={filtres.prixMax ?? ""}
              placeholder="—"
              onChange={(event) =>
                appliquer({ prixMax: event.target.value || null })
              }
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>

          <div className="sm:col-span-2 lg:col-span-4">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                name="indisponibles"
                defaultChecked={filtres.inclureIndisponibles}
                onChange={(event) =>
                  appliquer({
                    indisponibles: event.target.checked ? "1" : null,
                  })
                }
                className="size-4 rounded border-border"
              />
              <span>Voir aussi les biens indisponibles (loués et vendus)</span>
            </label>
          </div>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm text-muted-foreground">
        <p aria-live="polite">
          {enAttente ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              Recherche en cours…
            </span>
          ) : (
            <>
              <strong className="font-semibold text-foreground">{total}</strong>{" "}
              {total > 1 ? "biens trouvés" : "bien trouvé"}
            </>
          )}
        </p>

        {actifs ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={reinitialiser}
          >
            <X aria-hidden="true" />
            Réinitialiser les filtres
          </Button>
        ) : null}
      </div>
    </div>
  );
}
