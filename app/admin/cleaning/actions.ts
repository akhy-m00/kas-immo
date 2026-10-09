"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createCleaningService,
  deleteCleaningService,
  parseCleaningServiceForm,
  updateCleaningService,
  type CleaningFieldErrors,
} from "@/lib/cleaning-admin";
import { describeCleaningPhotoError } from "@/lib/cleaning";
import { requireAdmin } from "@/lib/supabase/auth";
import { estUuid } from "@/lib/ids";

/**
 * Écritures de l'espace admin Cleaning.
 *
 * ⚠️ `app/admin/layout.tsx` protège les PAGES, pas les Server Actions : une
 * action est une route HTTP publique, atteignable sans passer par un rendu de
 * page. Chaque fonction rappelle donc `requireAdmin()` avant toute écriture.
 * C'est cette garde — et non le layout — qui fait la sécurité ici ; les
 * politiques RLS restent la seconde barrière, appliquée par le client de la
 * session.
 */

/** État renvoyé au formulaire après une soumission. */
export type CleaningFormState = {
  error: string | null;
  fieldErrors: CleaningFieldErrors;
} | null;

/** Résultat d'une action déclenchée depuis un bouton, pas le formulaire. */
export type CleaningActionResult = { ok: true } | { ok: false; error: string };


/** Messages de succès affichés sur la liste après une redirection. */
const SUCCES = {
  cree: "service-cree",
  modifie: "service-modifie",
} as const;

/**
 * Invalide les pages publiques qui affichent les prestations.
 *
 * `/cleaning` est mise en cache (ISR). Sans cet appel, publier une prestation
 * mettrait jusqu'à cinq minutes avant d'apparaître sur le site.
 */
function revalidatePagesPubliques() {
  revalidatePath("/cleaning");
}

/**
 * Extrait la photo jointe au formulaire, après vérification.
 *
 * Le champ `<input type="file">` du navigateur renvoie toujours une entrée,
 * même vide : sans ce filtre, chaque enregistrement sans nouvelle photo
 * essayerait d'envoyer un fichier de zéro octet.
 *
 * @returns la photo, `null` si aucune n'a été choisie, ou un message d'erreur
 *   si le fichier est refusé.
 */
function lirePhoto(
  formData: FormData,
): { ok: true; file: File | null } | { ok: false; error: string } {
  const file = formData.get("photo");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: true, file: null };
  }

  const erreur = describeCleaningPhotoError(file);

  if (erreur) {
    return { ok: false, error: erreur };
  }

  return { ok: true, file };
}

/**
 * Crée ou met à jour un service.
 *
 * Un seul point d'entrée pour la création et la modification : les deux
 * partagent le même formulaire, et l'identifiant voyage dans un champ caché
 * plutôt que dans l'URL de l'action.
 */
export async function saveCleaningService(
  _previous: CleaningFormState,
  formData: FormData,
): Promise<CleaningFormState> {
  await requireAdmin();

  const parsed = parseCleaningServiceForm(formData);

  if (!parsed.ok) {
    return { error: parsed.error, fieldErrors: parsed.fieldErrors };
  }

  const photo = lirePhoto(formData);

  if (!photo.ok) {
    return { error: photo.error, fieldErrors: { photo: photo.error } };
  }

  const id = formData.get("id");

  // Un identifiant présent mais mal formé ne doit pas atteindre la base : il
  // ferait échouer la requête pour une raison incompréhensible.
  if (id !== null && id !== "" && (typeof id !== "string" || !estUuid(id))) {
    return { error: "Ce service est introuvable.", fieldErrors: {} };
  }

  const resultat =
    id === null || id === ""
      ? await createCleaningService(parsed.value, photo.file)
      : await updateCleaningService(id as string, parsed.value, photo.file);

  if (!resultat.ok) {
    return { error: resultat.error, fieldErrors: {} };
  }

  revalidatePagesPubliques();

  redirect(`/admin/cleaning?succes=${id ? SUCCES.modifie : SUCCES.cree}`);
}

/** Supprime un service, sa photo du bucket comprise. */
export async function deleteCleaningServiceAction(
  serviceId: string,
): Promise<CleaningActionResult> {
  await requireAdmin();

  if (!estUuid(serviceId)) {
    return { ok: false, error: "Ce service est introuvable." };
  }

  const resultat = await deleteCleaningService(serviceId);

  if (!resultat.ok) return { ok: false, error: resultat.error };

  revalidatePagesPubliques();

  return { ok: true };
}
