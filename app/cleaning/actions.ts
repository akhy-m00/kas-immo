"use server";

import {
  parseCleaningQuoteForm,
  type CleaningQuoteFieldErrors,
} from "@/lib/requests";
import { creerDemandeDevisCleaning } from "@/lib/requests-public";

/**
 * Dépôt d'une demande de rendez-vous Cleaning depuis `/cleaning`.
 *
 * ⚠️ Comme `submitVisitRequest()`, il n'y a AUCUN `requireAdmin()` ici : cette
 * action est publique par nature, c'est elle qui reçoit les demandes des
 * visiteurs non connectés. Sa protection est la validation ci-dessous, plus les
 * politiques RLS de `requests`, qui contraignent le lecteur, l'écrivain et les
 * colonnes modifiables.
 *
 * Rien de plus n'est reçu du client qu'un type de nettoyage, un créneau et une
 * identité : `type`, `status`, `user_id`, `property_id` et `cleaning_service_id`
 * sont tous posés par `creerDemandeDevisCleaning()`.
 */

/** État renvoyé au formulaire de rendez-vous après une soumission. */
export type CleaningQuoteFormState =
  | {
      ok: boolean;
      error: string | null;
      fieldErrors: CleaningQuoteFieldErrors;
    }
  | null;

export async function submitCleaningQuoteRequest(
  _previous: CleaningQuoteFormState,
  formData: FormData,
): Promise<CleaningQuoteFormState> {
  const parsed = parseCleaningQuoteForm(formData);

  if (!parsed.ok) {
    return {
      ok: false,
      error: "Certains champs sont à corriger.",
      fieldErrors: parsed.fieldErrors,
    };
  }

  const resultat = await creerDemandeDevisCleaning(parsed.value);

  if (!resultat.ok) {
    return { ok: false, error: resultat.error, fieldErrors: {} };
  }

  return { ok: true, error: null, fieldErrors: {} };
}