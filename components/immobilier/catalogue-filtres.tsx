"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
 * s'appliquent dès qu'ils changent. Les champs saisis au clavier (recherche,
 * prix) attendent une courte pause avant de s'appliquer, pour ne pas relancer
 * une requête à chaque lettre ou chiffre tapé.
 *
 * ⚠️ Toutes les navigations passent `{ scroll: false }` : sans cette option,
 * l'App Router remonte en haut de la page à chaque changement d'URL, et le
 * champ en cours de saisie sortait de l'écran sur mobile.
 */

type CatalogueFiltresProps = {
  filtres: CatalogueFiltres;
  /** Nombre de biens affichés, pour « X biens trouvés ». */
  total: number;
  /** Vrai si des filtres sont actifs, pour proposer la réinitialisation. */
  actifs: boolean;
};

/**
 * Pause de saisie avant d'appliquer un champ texte ou prix. Assez longue pour
 * qu'un prix tapé chiffre par chiffre ne déclenche qu'une seule requête.
 */
const DELAI_SAISIE_MS = 450;

export function CatalogueFiltres({
  filtres,
  total,
  actifs,
}: CatalogueFiltresProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [enAttente, demarrer] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Saisies au clavier pas encore appliquées, par paramètre d'URL.
  const saisiesEnAttenteRef = useRef<Record<string, string | null>>({});

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

  /**
   * Applique des filtres, en y joignant les saisies encore en attente : un
   * choix dans une liste juste après avoir tapé un prix ne doit pas perdre ce
   * prix.
   */
  function appliquer(modifications: Record<string, string | null>) {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const toutes = { ...saisiesEnAttenteRef.current, ...modifications };
    saisiesEnAttenteRef.current = {};

    demarrer(() => {
      router.push(construireURL(toutes), { scroll: false });
    });
  }

  /** Champ saisi au clavier : appliqué après une pause de frappe. */
  function changerTexte(cle: string, valeur: string) {
    saisiesEnAttenteRef.current[cle] = valeur.trim() || null;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => appliquer({}), DELAI_SAISIE_MS);
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
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
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
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
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
              onChange={(event) => changerTexte("prixMin", event.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
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
              onChange={(event) => changerTexte("prixMax", event.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
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
        {/* Les deux libellés occupent la même cellule de grille et seul
            l'un est visible : la ligne garde la largeur et la hauteur du plus
            grand des deux, donc rien ne bouge quand la recherche démarre ou
            se termine. */}
        <p aria-live="polite" className="grid min-h-8 items-center">
          <span
            className={cn(
              "col-start-1 row-start-1 inline-flex items-center gap-2",
              !enAttente && "invisible",
            )}
          >
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Recherche en cours…
          </span>
          <span
            className={cn("col-start-1 row-start-1", enAttente && "invisible")}
          >
            <strong className="font-semibold text-foreground">{total}</strong>{" "}
            {total > 1 ? "biens trouvés" : "bien trouvé"}
          </span>
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
