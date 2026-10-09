"use server";

import { parseVisitRequestForm, type VisitRequestFieldErrors } from "@/lib/requests";
import { creerDemandeVisite } from "@/lib/requests-public";
import { estUuid } from "@/lib/ids";

/**
 * Dépôt d'une demande de visite depuis la fiche d'un bien.
 *
 * ⚠️ Contrairement aux actions de `app/admin/*`, il n'y a AUCUN `requireAdmin()`
 * ici : cette action est publique par nature, c'est elle qui reçoit les
 * demandes des visiteurs non connectés. Sa protection n'est pas un garde mais
 * la validation ci-dessous, plus les politiques RLS de `requests` — qui
 * contraignent le lecteur, l'écrivain et les colonnes modifiables.
 *
 * Le bien est déduit d'un champ caché `propertyId`, jamais d'un texte libre :
 * le visiteur n'a rien à recopier, et une valeur forgée est rejetée par le
 * contrôle UUID puis par la vérification du bien dans `creerDemandeVisite`.
 */

/** État renvoyé au formulaire après une soumission. */
export type VisitRequestFormState =
  | {
      ok: boolean;
      error: string | null;
      fieldErrors: VisitRequestFieldErrors;
    }
  | null;


export async function submitVisitRequest(
  _previous: VisitRequestFormState,
  formData: FormData,
): Promise<VisitRequestFormState> {
  const propertyId = formData.get("propertyId");

  // Identifiant absent ou corrompu : le bien n'est pas connu, la demande ne
  // peut donc pas être rattachée. Message global plutôt qu'erreur de champ, car
  // le champ concerné n'est pas visible par le visiteur.
  if (typeof propertyId !== "string" || !estUuid(propertyId)) {
    return {
      ok: false,
      error: "Cette demande n'a pas pu être rattachée à un bien.",
      fieldErrors: {},
    };
  }

  const parsed = parseVisitRequestForm(formData);

  if (!parsed.ok) {
    return {
      ok: false,
      error: "Certains champs sont à corriger.",
      fieldErrors: parsed.fieldErrors,
    };
  }

  const resultat = await creerDemandeVisite(parsed.value, propertyId);

  if (!resultat.ok) {
    return { ok: false, error: resultat.error, fieldErrors: {} };
  }

  return { ok: true, error: null, fieldErrors: {} };
}
