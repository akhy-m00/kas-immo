"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  countPropertyPhotos,
  createProperty,
  deletePhoto,
  deleteProperty,
  parsePropertyForm,
  readPhotoFiles,
  reorderPhotos,
  updateProperty,
  validatePhotoFiles,
  type FieldErrors,
} from "@/lib/properties-admin";
import { requireAdmin } from "@/lib/supabase/auth";
import { estUuid } from "@/lib/ids";

/**
 * Écritures de l'espace admin.
 *
 * ⚠️ `app/admin/layout.tsx` protège les PAGES, pas les Server Actions : une
 * action est une route HTTP publique, atteignable sans passer par un rendu de
 * page. Chaque fonction rappelle donc `requireAdmin()` avant toute écriture.
 * C'est cette garde — et non le layout — qui fait la sécurité ici ; les
 * politiques RLS restent la seconde barrière, appliquée par le client de la
 * session.
 */

/** État renvoyé au formulaire après une soumission. */
export type PropertyFormState = {
  error: string | null;
  fieldErrors: FieldErrors;
} | null;


/** Résultat d'une action déclenchée depuis un bouton (pas le formulaire). */
export type ActionResult = { ok: true } | { ok: false; error: string };

/** Messages de succès affichés sur la liste après une redirection. */
const SUCCES = {
  cree: "bien-cree",
  modifie: "bien-modifie",
} as const;

/**
 * Crée ou met à jour un bien, et enregistre les photos choisies.
 *
 * Un seul point d'entrée pour la création et la modification : les deux
 * partagent le même formulaire, et l'identifiant voyage dans un champ caché
 * plutôt que dans l'URL de l'action.
 */
export async function saveProperty(
  _previous: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const admin = await requireAdmin();

  const parsed = parsePropertyForm(formData);

  if (!parsed.ok) {
    return { error: null, fieldErrors: parsed.fieldErrors };
  }

  const id = identifiant(formData);

  // Un identifiant présent mais mal formé ne doit pas atteindre la base : il
  // ferait échouer la requête pour une raison incompréhensible.
  if (id === false) {
    return { error: "Ce bien est introuvable.", fieldErrors: {} };
  }

  const files = readPhotoFiles(formData);
  let photosExistantes = 0;

  if (id) {
    try {
      photosExistantes = await countPropertyPhotos(id);
    } catch {
      return { error: "Ce bien est introuvable.", fieldErrors: {} };
    }
  }

  const controle = validatePhotoFiles(files, photosExistantes);

  if (!controle.ok) {
    return { error: controle.error, fieldErrors: {} };
  }

  const ordre = ordreDemande(formData);

  const resultat = id
    ? await updateProperty(id, parsed.value, files, ordre)
    : await createProperty(parsed.value, files, admin.id, ordre);

  if (!resultat.ok) {
    return { error: resultat.error, fieldErrors: {} };
  }

  revalidatePath("/admin/biens");
  revalidatePath("/admin");
  revalidatePagesPubliques(resultat.id);

  // `redirect()` termine l'action : le message de succès est lu au prochain
  // rendu de la liste, en HTML, sans état à transporter côté navigateur.
  redirect(
    id
      ? `/admin/biens?succes=${SUCCES.modifie}`
      : `/admin/biens?succes=${SUCCES.cree}`,
  );
}

/**
 * Invalide les pages publiques qui affichent un bien.
 *
 * `/`, `/immobilier` et `/immobilier/[id]` sont mises en cache (ISR). Sans cet
 * appel, publier un bien mettrait jusqu'à cinq minutes avant d'apparaître sur
 * le site : un administrateur qui enregistre puis regarde la page verrait un
 * catalogue vide, et pourrait créer un doublon en réessayant.
 */
function revalidatePagesPubliques(bienId?: string) {
  revalidatePath("/");
  revalidatePath("/immobilier");
  if (bienId) revalidatePath(`/immobilier/${bienId}`);
}

/** Supprime un bien, ses photos en base et les fichiers du bucket. */
export async function deletePropertyAction(
  propertyId: string,
): Promise<ActionResult> {
  await requireAdmin();

  if (!estUuid(propertyId)) {
    return { ok: false, error: "Ce bien est introuvable." };
  }

  const resultat = await deleteProperty(propertyId);

  if (!resultat.ok) return { ok: false, error: resultat.error };

  revalidatePath("/admin/biens");
  revalidatePath("/admin");
  revalidatePagesPubliques(resultat.id);

  return { ok: true };
}

/** Supprime une seule photo, du bucket et de la base. */
export async function deletePhotoAction(
  photoId: string,
): Promise<ActionResult> {
  await requireAdmin();

  if (!estUuid(photoId)) {
    return { ok: false, error: "Cette photo est introuvable." };
  }

  const resultat = await deletePhoto(photoId);

  if (!resultat.ok) return { ok: false, error: resultat.error };

  revalidatePath("/admin/biens");
  // La photo disparaît aussi de la galerie de la fiche publique.
  revalidatePagesPubliques(resultat.propertyId);

  return { ok: true };
}

/** Enregistre l'ordre des photos d'un bien. */
export async function reorderPhotosAction(
  propertyId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  await requireAdmin();

  if (!estUuid(propertyId) || !Array.isArray(orderedIds)) {
    return { ok: false, error: "L'ordre des photos est inchangé." };
  }

  const resultat = await reorderPhotos(propertyId, orderedIds);

  if (!resultat.ok) return { ok: false, error: resultat.error };

  revalidatePath("/admin/biens");
  // L'ordre des photos est celui de la galerie publique.
  revalidatePagesPubliques(propertyId);

  return { ok: true };
}

// =============================================================================
// Lecture des paramètres de la requête
// =============================================================================

/**
 * Identifiant du bien à modifier, ou `null` pour une création.
 *
 * @returns `false` si un identifiant est présent mais n'est pas un UUID : la
 *   distinction avec `null` permet de ne pas créer un bien par accident quand
 *   l'identifiant reçu est corrompu.
 */
function identifiant(formData: FormData): string | null | false {
  const value = formData.get("id");
  if (typeof value !== "string" || value === "") return null;
  return estUuid(value) ? value : false;
}

/** Lit l'ordre des photos demandé par le formulaire. */
function ordreDemande(formData: FormData): string[] {
  const value = formData.get("photosOrder");

  if (typeof value !== "string" || !value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    // Un ordre illisible ne doit pas empêcher l'enregistrement du bien : les
    // photos gardent alors l'ordre d'envoi.
    return [];
  }
}
