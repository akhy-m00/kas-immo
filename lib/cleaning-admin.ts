import {
  CLEANING_BUCKET,
  CLEANING_DESCRIPTION_MAX,
  CLEANING_TITLE_MAX,
  CLEANING_TITLE_MIN,
  cleaningPhotoPath,
  cleaningPhotoPathFromUrl,
} from "@/lib/cleaning";
import { prepareImageForUpload } from "@/lib/image-webp";
import { supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { CleaningService } from "@/lib/supabase/database.types";

/**
 * Accès aux prestations de cleaning côté serveur.
 *
 * ⚠️ Même règle que pour les biens : toutes les lectures et toutes les
 * écritures passent par `createClient()`, c'est-à-dire par le client de la
 * session de l'utilisateur connecté. Aucune clé de service n'est utilisée
 * nulle part : c'est ce qui fait que les politiques RLS s'appliquent
 * réellement. Les gardes `requireAdmin()` sont dans les Server Actions, pas
 * ici — ce module est appelé par des pages admin (protégées par leur layout)
 * comme par les actions.
 */

/** Client authentifié, dont le type exact n'a pas d'intérêt ici. */
type Session = Awaited<ReturnType<typeof createClient>>;

/** Champs d'un service, une fois le formulaire validé. */
export type CleaningServiceInput = {
  title: string;
  description: string;
};

/** Résultat d'une écriture : succès, ou message d'erreur à afficher. */
export type CleaningWriteResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Erreurs de validation par nom de champ, pour le formulaire. */
export type CleaningFieldErrors = Record<string, string>;

const CLEANING_SELECT = "id, title, description, image_url, created_at";

/** Message d'erreur lisible à partir d'une erreur Supabase. */
function erreurMessage(
  error: { message: string; code?: string } | null,
  defaut: string,
): string {
  if (!error) return defaut;

  // RLS : une écriture refusée par une politique ne produit pas toujours une
  // erreur exploitable, le message technique n'aide donc pas l'administrateur.
  if (error.code === "42501") {
    return "Ce compte administrateur n'a plus les droits nécessaires.";
  }

  return error.message || defaut;
}

/** Un fichier déjà absent du bucket n'est pas une erreur de suppression. */
function isNotFound(error: { status?: number; message?: string }): boolean {
  return error.status === 404 || /not found/i.test(error.message ?? "");
}

// =============================================================================
// Lecture
// =============================================================================

/** Tous les services, du plus récent au plus ancien. */
export async function listCleaningServices(): Promise<CleaningService[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cleaning_services")
    .select(CLEANING_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      erreurMessage(error, "Les services de cleaning sont injoignables."),
    );
  }

  return data ?? [];
}

/** Un service par son identifiant, ou `null` s'il n'existe pas. */
export async function findCleaningService(
  id: string,
): Promise<CleaningService | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cleaning_services")
    .select(CLEANING_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(erreurMessage(error, "Ce service est injoignable."));
  }

  return data;
}

// =============================================================================
// Validation
// =============================================================================

/** Nettoie une saisie : espaces superflus et sauts de ligne superflus. */
function nettoyer(valeur: string): string {
  return valeur.replace(/\s+/g, " ").trim();
}

/**
 * Valide le `FormData` du formulaire.
 *
 * Titre et description sont tous deux obligatoires : une carte sans texte
 * n'a rien à annoncer sur la page publique. La validation est faite ici et
 * pas seulement dans le formulaire, parce qu'une Server Action est une route
 * HTTP publique, directement appelable sans passer par l'interface.
 */
export function parseCleaningServiceForm(
  formData: FormData,
):
  | { ok: true; value: CleaningServiceInput }
  | { ok: false; error: string; fieldErrors: CleaningFieldErrors } {
  const fieldErrors: CleaningFieldErrors = {};

  const title = nettoyer(String(formData.get("title") ?? ""));
  const description = String(formData.get("description") ?? "").trim();

  if (!title) {
    fieldErrors.title = "Le titre est obligatoire.";
  } else if (title.length < CLEANING_TITLE_MIN) {
    fieldErrors.title = `Le titre doit contenir au moins ${CLEANING_TITLE_MIN} caractères.`;
  } else if (title.length > CLEANING_TITLE_MAX) {
    fieldErrors.title = `Le titre ne doit pas dépasser ${CLEANING_TITLE_MAX} caractères.`;
  }

  if (!description) {
    fieldErrors.description = "La description est obligatoire.";
  } else if (description.length > CLEANING_DESCRIPTION_MAX) {
    fieldErrors.description = `La description ne doit pas dépasser ${CLEANING_DESCRIPTION_MAX} caractères.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: "Certains champs sont à corriger.",
      fieldErrors,
    };
  }

  return { ok: true, value: { title, description } };
}

// =============================================================================
// Stockage
// =============================================================================

/** Traduit une URL publique en chemin interne, ou `null` si elle est étrangère. */
function storedPath(url: string | null): string | null {
  if (!url) return null;
  return cleaningPhotoPathFromUrl(url, supabaseUrl());
}

/** Envoie la photo d'un service et renvoie son URL publique et son chemin. */
async function uploadPhoto(
  supabase: Session,
  serviceId: string,
  file: File,
): Promise<
  | { ok: true; url: string; path: string }
  | { ok: false; error: string; path: string }
> {
  // Ré-encodage WebP avant l'envoi : le chemin porte l'extension du contenu
  // réellement déposé, pour que l'URL en base et le chemin reconstruit à la
  // suppression restent cohérents.
  const image = await prepareImageForUpload(file);

  const path = cleaningPhotoPath(
    serviceId,
    image.name,
    crypto.randomUUID().slice(0, 8),
  );

  const { error } = await supabase.storage
    .from(CLEANING_BUCKET)
    .upload(path, image.body, {
      contentType: image.contentType,
      // L'URL du fichier est immuable : un cache long évite le retéléchargement
      // à chaque visite, et il est invalidé de toute façon par le nom unique.
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    return {
      ok: false,
      error: `« ${file.name} » n'a pas pu être envoyé : ${erreurMessage(error, "raison inconnue")}`,
      path,
    };
  }

  // `getPublicUrl` ne peut pas échouer : le bucket est public, l'adresse est
  // calculée localement à partir du chemin, sans appel réseau.
  const { data: publicUrl } = supabase.storage
    .from(CLEANING_BUCKET)
    .getPublicUrl(path);

  if (!publicUrl?.publicUrl) {
    return {
      ok: false,
      error: `« ${file.name} » a été envoyé mais son adresse est introuvable.`,
      path,
    };
  }

  return { ok: true, url: publicUrl.publicUrl, path };
}

/** Supprime un fichier du bucket ; un fichier déjà absent n'est pas une erreur. */
async function removeFile(supabase: Session, path: string): Promise<boolean> {
  const { error } = await supabase.storage.from(CLEANING_BUCKET).remove([path]);

  if (!error) return true;
  return isNotFound(error);
}

// =============================================================================
// Écriture
// =============================================================================

/**
 * Crée un service, avec sa photo si l'une a été choisie.
 *
 * Comme pour un bien, la ligne est créée AVANT l'envoi du fichier : le chemin
 * de stockage contient l'identifiant du service. Si l'envoi échoue, la ligne
 * est supprimée pour ne pas laisser un service sans photo alors que
 * l'administrateur croit l'avoir enregistré.
 */
export async function createCleaningService(
  input: CleaningServiceInput,
  file: File | null,
): Promise<CleaningWriteResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cleaning_services")
    .insert({ title: input.title, description: input.description })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: erreurMessage(error, "Le service n'a pas pu être créé."),
    };
  }

  const serviceId = data.id;

  if (!file) return { ok: true, id: serviceId };

  const uploaded = await uploadPhoto(supabase, serviceId, file);

  if (!uploaded.ok) {
    // Annulation : on ne laisse pas de service orphelin sans photo.
    await supabase.from("cleaning_services").delete().eq("id", serviceId);
    return { ok: false, error: uploaded.error };
  }

  // La photo est attachée dans un second temps. Si cet UPDATE échoue, le
  // fichier tout juste envoyé est retiré : sans cela le bucket accumule des
  // orphelins, invisibles et impossibles à nettoyer depuis l'interface.
  const { error: updateError } = await supabase
    .from("cleaning_services")
    .update({ image_url: uploaded.url })
    .eq("id", serviceId);

  if (updateError) {
    await removeFile(supabase, uploaded.path);
    await supabase.from("cleaning_services").delete().eq("id", serviceId);
    return {
      ok: false,
      error: erreurMessage(
        updateError,
        "La photo n'a pas pu être associée au service.",
      ),
    };
  }

  return { ok: true, id: serviceId };
}

/**
 * Met à jour un service.
 *
 * Remplacer la photo est une opération en trois temps : envoyer le nouveau
 * fichier, pointer la colonne vers lui, puis supprimer l'ancien. L'ordre est
 * important — si l'envoi échoue, l'ancien fichier reste en place et le service
 * continue de s'afficher correctement.
 */
export async function updateCleaningService(
  id: string,
  input: CleaningServiceInput,
  file: File | null,
): Promise<CleaningWriteResult> {
  const supabase = await createClient();

  const existant = await findCleaningService(id);

  if (!existant) {
    return { ok: false, error: "Ce service est introuvable." };
  }

  const ancienChemin = storedPath(existant.image_url);

  let nouveau: { url: string; path: string } | null = null;

  if (file) {
    const uploaded = await uploadPhoto(supabase, id, file);

    if (!uploaded.ok) {
      return { ok: false, error: uploaded.error };
    }

    nouveau = { url: uploaded.url, path: uploaded.path };
  }

  const { error } = await supabase
    .from("cleaning_services")
    .update({
      title: input.title,
      description: input.description,
      ...(nouveau ? { image_url: nouveau.url } : {}),
    })
    .eq("id", id);

  if (error) {
    // L'écriture a échoué : on retire le fichier devenu inutile plutôt que de
    // laisser un objet orphelin dans le bucket.
    if (nouveau) await removeFile(supabase, nouveau.path);

    return {
      ok: false,
      error: erreurMessage(error, "Le service n'a pas pu être modifié."),
    };
  }

  // L'ancien fichier n'est retiré qu'après l'écriture réussie : il sert de
  // filet si l'UPDATE est finalement refusé par une politique RLS.
  if (nouveau && ancienChemin) {
    await removeFile(supabase, ancienChemin);
  }

  return { ok: true, id };
}

/**
 * Supprime un service et sa photo.
 *
 * `delete().select()` plutôt que `delete()` seul : une ligne exclue par une
 * politique RLS ne produit AUCUNE erreur, la suppression est simplement sans
 * effet. Le nombre de lignes renvoyées est le seul moyen de savoir si elle a
 * réellement eu lieu — sans cette vérification, une suppression inopérante
 * serait rapportée comme une réussite.
 */
export async function deleteCleaningService(
  id: string,
): Promise<CleaningWriteResult> {
  const supabase = await createClient();

  const service = await findCleaningService(id);

  if (!service) {
    return {
      ok: false,
      error:
        "Ce service n'existe pas, ou ce compte administrateur n'a plus le droit de le supprimer.",
    };
  }

  const chemin = storedPath(service.image_url);

  // Le fichier part d'abord : une photo orpheline est invisible et impossible à
  // nettoyer depuis l'interface, alors qu'un service sans photo s'affiche avec
  // une vignette de repli. En cas d'échec, la ligne est laissée en place.
  if (chemin) {
    const supprime = await removeFile(supabase, chemin);

    if (!supprime) {
      return {
        ok: false,
        error: "La photo n'a pas pu être supprimée du stockage. Réessayez.",
      };
    }
  }

  const { data: supprime, error } = await supabase
    .from("cleaning_services")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return {
      ok: false,
      error: erreurMessage(error, "Le service n'a pas pu être supprimé."),
    };
  }

  if (!supprime || supprime.length === 0) {
    return {
      ok: false,
      error:
        "Le service n'existe pas, ou ce compte administrateur n'a plus le droit de le supprimer.",
    };
  }

  return { ok: true, id };
}
