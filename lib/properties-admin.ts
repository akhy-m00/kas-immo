import {
  PHOTO_MAX_COUNT,
  STORAGE_BUCKET,
  STATUS_VALUES,
  TRANSACTION_VALUES,
  TYPE_VALUES,
  describePhotoError,
  photoPathFromUrl,
  photoStoragePath,
  type PropertyWithPhotos,
} from "@/lib/properties";
import { prepareImageForUpload } from "@/lib/image-webp";
import { supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type {
  Property,
  PropertyPhoto,
  PropertyStatus,
  PropertyType,
  TransactionType,
} from "@/lib/supabase/database.types";

/**
 * Accès aux biens côté serveur.
 *
 * ⚠️ Toutes les lectures et toutes les écritures passent par `createClient()`,
 * c'est-à-dire par le client de la session de l'utilisateur connecté. Aucune
 * clé de service n'est utilisée nulle part dans le projet : c'est ce qui fait
 * que les politiques RLS s'appliquent réellement. Si l'une d'elles était
 * contournée ici, un simple client pourrait écrire dans `properties` — le
 * `service_role` n'existe donc volontairement pas dans `.env.local`.
 *
 * Sélecteurs empilés pour lire un bien et ses photos en une seule requête.
 * Le nom de la clé étrangère est celui créé par PostgreSQL.
 */
const PROPERTY_SELECT =
  "id, title, description, type, transaction_type, price, location, status, created_by, created_at, property_photos (id, property_id, url, position, created_at)";

/** Une ligne de `properties` avec ses photos, avant tri. */
type PropertyRow = Omit<Property, "price"> & {
  price: number;
  property_photos: PropertyPhoto[];
};

export type PropertyFilters = {
  statut?: string;
  type?: string;
  transaction?: string;
  recherche?: string;
};

/** Champs d'un bien, une fois le formulaire validé. */
export type PropertyInput = {
  title: string;
  description: string | null;
  type: PropertyType;
  transaction_type: TransactionType;
  price: number;
  location: string;
  status: PropertyStatus;
};

/** Résultat d'une écriture : succès, ou message d'erreur à afficher. */
export type WriteResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Retour de `deletePhoto`. Il expose le bien d'origine plutôt que la photo :
 * c'est la fiche publique correspondante qu'il faut rafraîchir.
 */
export type PhotoDeleteResult =
  { ok: true; propertyId: string } | { ok: false; error: string };

/** Erreur de validation d'un champ, par nom de champ du formulaire. */
export type FieldErrors = Record<string, string>;

const isOneOf = <T extends string>(
  values: readonly T[],
  value: string,
): value is T => (values as readonly string[]).includes(value);

/** Ordonne les photos par `position`, puis trie les biens du plus récent au plus ancien. */
function toPropertyWithPhotos(row: PropertyRow): PropertyWithPhotos {
  const { property_photos, ...property } = row;
  const photos = [...(property_photos ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  return { ...property, photos };
}

// =============================================================================
// Lecture
// =============================================================================

/**
 * Tous les biens, filtres appliqués, du plus récent au plus ancien.
 *
 * Les filtres sont posés sur la requête et non en JavaScript : la base ne
 * renvoie que les lignes utiles, et les index `properties_*_idx` déjà créés
 * dans le schéma sont utilisés.
 */
export async function listProperties(
  filters: PropertyFilters = {},
): Promise<PropertyWithPhotos[]> {
  const supabase = await createClient();

  let query = supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .order("created_at", { ascending: false });

  if (filters.statut && isOneOf(STATUS_VALUES, filters.statut)) {
    query = query.eq("status", filters.statut);
  }

  if (filters.type && isOneOf(TYPE_VALUES, filters.type)) {
    query = query.eq("type", filters.type);
  }

  if (filters.transaction && isOneOf(TRANSACTION_VALUES, filters.transaction)) {
    query = query.eq("transaction_type", filters.transaction);
  }

  const recherche = filters.recherche?.trim();
  if (recherche) {
    // `ilike` avec wildcards : insensitive à la casse, contrairement à `eq`.
    // Le titre est échappé pour qu'un `%` ou un `_` saisis par l'utilisateur
    // soit cherché littéralement et ne se transforme pas en joker.
    query = query.ilike("title", `%${escapeLike(recherche)}%`);
  }

  const { data, error } = await query;

  if (error)
    throw new Error(
      erreurMessage(error, "La liste des biens est injoignable."),
    );

  return (data ?? []).map(toPropertyWithPhotos);
}

/** Un bien et ses photos, ou `null` s'il n'existe pas (ou n'est pas lisible). */
export async function findProperty(
  id: string,
): Promise<PropertyWithPhotos | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(erreurMessage(error, "Ce bien est injoignable."));

  return data ? toPropertyWithPhotos(data) : null;
}

/** Nombre total de biens, sans filtre. */
export async function countProperties(): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase.from("properties").select("id", {
    count: "exact",
    head: true,
  });

  if (error)
    throw new Error(erreurMessage(error, "Les biens sont injoignables."));

  return count ?? 0;
}

/**
 * Nombre de photos déjà enregistrées pour un bien.
 *
 * Utilisé avant un envoi pour refuser un lot qui dépasserait le plafond. La
 * table `property_photos` n'ayant pas de politique d'écriture pour un non-admin,
 * le compte ne porte que sur les photos d'un bien réellement lisible.
 */
export async function countPropertyPhotos(propertyId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("property_photos")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);

  if (error)
    throw new Error(
      erreurMessage(error, "Les photos de ce bien sont injoignables."),
    );

  return count ?? 0;
}

/** Compteurs du tableau de bord. */
export type AdminStats = {
  total: number;
  parStatut: Record<PropertyStatus, number>;
  demandesNouvelles: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient();

  const parStatut: Record<PropertyStatus, number> = {
    disponible: 0,
    loue: 0,
    vendu: 0,
  };

  const [biens, demandes] = await Promise.all([
    supabase.from("properties").select("status"),
    supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "nouveau"),
  ]);

  if (biens.error)
    throw new Error(erreurMessage(biens.error, "Les biens sont injoignables."));

  // Même traitement que pour les biens : une erreur de lecture des demandes est
  // remontée, et non convertie en « 0 demande ». Un compteur bloqué à zéro
  // donnerait à l'administrateur l'impression que la boîte de réception est
  // vide alors qu'elle n'a simplement pas pu être lue.
  if (demandes.error)
    throw new Error(
      erreurMessage(demandes.error, "Les demandes sont injoignables."),
    );

  for (const row of biens.data ?? []) {
    parStatut[row.status] += 1;
  }

  return {
    total: (biens.data ?? []).length,
    parStatut,
    demandesNouvelles: demandes.count ?? 0,
  };
}

// =============================================================================
// Validation du formulaire
// =============================================================================

const MESSAGES = {
  titreVide: "Le titre est obligatoire.",
  descriptionTropLongue:
    "La description ne doit pas dépasser 5 000 caractères.",
  typeInvalide: "Choisissez un type de bien.",
  transactionInvalide: "Choisissez un type de transaction.",
  prixVide: "Le prix est obligatoire.",
  prixInvalide:
    "Le prix doit être un nombre entier positif, par exemple 1250000.",
  localisationVide: "La localisation est obligatoire.",
  statutInvalide: "Choisissez un statut.",
  tropPhotos: `Un bien ne peut pas avoir plus de ${PHOTO_MAX_COUNT} photos.`,
} as const;

/**
 * Plafond du prix : 9 000 milliards de FCFA.
 *
 * La colonne est un `bigint`, mais PostgREST renvoie un nombre JSON : rester
 * sous `Number.MAX_SAFE_INTEGER` garantit un aller-retour exact et évite un
 * refus obscur de la base sur une saisie aberrante.
 */
const MAX_PRICE = 9_000_000_000_000;

/**
 * Valide et normalise les champs reçus du formulaire.
 *
 * Les valeurs sont lues depuis le `FormData`, donc tout provient d'une requête
 * HTTP : aucune n'est fiable. Le typage des énumérations et de l'entier est donc
 * refait ici, et non repris tel que envoyé.
 */
export function parsePropertyForm(formData: FormData):
  | {
      ok: true;
      value: PropertyInput;
    }
  | { ok: false; fieldErrors: FieldErrors } {
  const fieldErrors: FieldErrors = {};

  const title = text(formData, "title");
  const description = text(formData, "description");
  const location = text(formData, "location");
  const type = text(formData, "type");
  const transaction = text(formData, "transaction");
  const status = text(formData, "status");
  const rawPrice = text(formData, "price");

  if (!title) fieldErrors.title = MESSAGES.titreVide;
  if (!location) fieldErrors.location = MESSAGES.localisationVide;
  if (description.length > 5000) {
    fieldErrors.description = MESSAGES.descriptionTropLongue;
  }

  if (!isOneOf(TYPE_VALUES, type)) {
    fieldErrors.type = MESSAGES.typeInvalide;
  }
  if (!isOneOf(TRANSACTION_VALUES, transaction)) {
    fieldErrors.transaction = MESSAGES.transactionInvalide;
  }
  if (!isOneOf(STATUS_VALUES, status)) {
    fieldErrors.status = MESSAGES.statutInvalide;
  }

  // Le prix est saisi en FCFA : les espaces et points de milliers sont retirés
  // avant conversion pour accepter « 1 250 000 » comme « 1.250.000 ».
  //
  // On valide d'abord la FORME saisie, avant de retirer les séparateurs. Un
  // simple `replace(/[^\d]/g, "")` laissait passer `-10` (devenu 10) et
  // `abc123` (devenu 123) : le champ du formulaire filtre déjà la saisie, mais
  // une requête forgée ne passe pas par le navigateur.
  let price: number | null = null;
  const saisieValide = /^[0-9][0-9\s.  ]*$/.test(rawPrice);
  const rawDigits = rawPrice.replace(/[\s.  ]/g, "");

  if (!rawPrice.trim()) {
    fieldErrors.price = MESSAGES.prixVide;
  } else if (!saisieValide || !/^[0-9]+$/.test(rawDigits)) {
    fieldErrors.price = MESSAGES.prixInvalide;
  } else {
    const valeur = Number(rawDigits);

    if (!Number.isSafeInteger(valeur) || valeur > MAX_PRICE) {
      fieldErrors.price = MESSAGES.prixInvalide;
    } else {
      price = valeur;
    }
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  return {
    ok: true,
    value: {
      title,
      description: description || null,
      type: type as PropertyType,
      transaction_type: transaction as TransactionType,
      price: price as number,
      location,
      status: status as PropertyStatus,
    },
  };
}

/** Récupère les fichiers photos d'un formulaire, en écartant les entrées vides. */
export function readPhotoFiles(formData: FormData): File[] {
  return formData
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

/** Vérifie le nombre et le poids des fichiers avant tout envoi. */
export function validatePhotoFiles(
  files: File[],
  photosExistantes: number,
): { ok: true } | { ok: false; error: string } {
  if (photosExistantes + files.length > PHOTO_MAX_COUNT) {
    return { ok: false, error: MESSAGES.tropPhotos };
  }

  for (const file of files) {
    const problem = describePhotoError(file);
    if (problem) return { ok: false, error: problem };
  }

  return { ok: true };
}

// =============================================================================
// Écriture
// =============================================================================

/**
 * Crée un bien, puis dépose ses photos.
 *
 * L'ordre n'est pas libre : le chemin de stockage contient l'identifiant du
 * bien, donc la ligne doit exister avant le premier envoi. Si une photo échoue
 * après l'insertion, on annule : les fichiers déjà déposés sont retirés du
 * bucket et la ligne créée est supprimée. L'admin ne se retrouve donc jamais
 * avec un bien vide laissé en base à cause d'une image refusée.
 */
export async function createProperty(
  input: PropertyInput,
  files: File[],
  authorId: string,
  orderTokens: string[] = [],
): Promise<WriteResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("properties")
    .insert({
      title: input.title,
      description: input.description,
      type: input.type,
      transaction_type: input.transaction_type,
      price: input.price,
      location: input.location,
      status: input.status,
      created_by: authorId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: erreurMessage(error, "Le bien n'a pas pu être créé."),
    };
  }

  const propertyId = data.id;
  const uploaded = await uploadPhotos(supabase, propertyId, files, 0);

  if (!uploaded.ok) {
    await rollbackCreate(supabase, propertyId, uploaded.paths);
    return { ok: false, error: uploaded.error };
  }

  const ordered = await applyRequestedOrder(
    supabase,
    propertyId,
    orderTokens,
    uploaded.ids,
  );

  if (!ordered.ok) {
    await rollbackCreate(supabase, propertyId, uploaded.paths);
    return { ok: false, error: ordered.error };
  }

  return { ok: true, id: propertyId };
}

/**
 * Met à jour un bien et ajoute les nouvelles photos.
 *
 * L'envoi précède la mise à jour des champs : si l'image est refusée, rien du
 * bien n'a encore bougé, donc l'admin peut corriger et réessayer sans perdre
 * ses modifications. Les photos déjà enregistrées ne sont pas touchées — leur
 * suppression et leur ordre se gèrent par des actions dédiées.
 */
export async function updateProperty(
  id: string,
  input: PropertyInput,
  files: File[],
  orderTokens: string[] = [],
): Promise<WriteResult> {
  const supabase = await createClient();

  const existing = await supabase
    .from("property_photos")
    .select("id, position")
    .eq("property_id", id);

  if (existing.error) {
    return {
      ok: false,
      error: erreurMessage(existing.error, "Ce bien est injoignable."),
    };
  }

  if ((existing.data ?? []).length === 0) {
    // Un bien sans aucune photo est un cas normal, pas une erreur : c'est
    // l'identifiant inconnu qui doit être distingué.
    const bien = await supabase
      .from("properties")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (bien.error || !bien.data) {
      return {
        ok: false,
        error: "Ce bien n'existe pas ou n'est plus accessible.",
      };
    }
  }

  const nextPosition =
    (existing.data ?? []).reduce(
      (max, photo) => Math.max(max, photo.position),
      -1,
    ) + 1;

  const uploaded = await uploadPhotos(supabase, id, files, nextPosition);

  if (!uploaded.ok) {
    await discardUploadedPhotos(supabase, uploaded.ids, uploaded.paths);
    return { ok: false, error: uploaded.error };
  }

  // `select("id")` pour la même raison qu'à la suppression : une mise à jour
  // qui ne touche aucune ligne ne renvoie pas d'erreur, et l'administrateur
  // croirait avoir enregistré alors que rien n'a bougé.
  const { data: modifie, error } = await supabase
    .from("properties")
    .update({
      title: input.title,
      description: input.description,
      type: input.type,
      transaction_type: input.transaction_type,
      price: input.price,
      location: input.location,
      status: input.status,
    })
    .eq("id", id)
    .select("id");

  if (error) {
    await discardUploadedPhotos(supabase, uploaded.ids, uploaded.paths);
    return {
      ok: false,
      error: erreurMessage(error, "Le bien n'a pas pu être modifié."),
    };
  }

  if (!modifie || modifie.length === 0) {
    await discardUploadedPhotos(supabase, uploaded.ids, uploaded.paths);
    return {
      ok: false,
      error: "Ce bien n'existe pas ou n'est plus modifiable.",
    };
  }

  const ordered = await applyRequestedOrder(
    supabase,
    id,
    orderTokens,
    uploaded.ids,
  );

  if (!ordered.ok) {
    await discardUploadedPhotos(supabase, uploaded.ids, uploaded.paths);
    return { ok: false, error: ordered.error };
  }

  return { ok: true, id };
}

/**
 * Réécrit l'ordre des photos d'un bien d'après les jetons du formulaire.
 *
 * L'ensemble des photos réellement en base est relu après l'envoi, pour que le
 * tri se fasse sur l'état définitif (nouvelles photos comprises) et non sur une
 * liste calculée avant l'écriture.
 */
async function applyRequestedOrder(
  supabase: SupabaseClient,
  propertyId: string,
  orderTokens: string[],
  newPhotoIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const current = await supabase
    .from("property_photos")
    .select("id")
    .eq("property_id", propertyId);

  if (current.error) {
    return {
      ok: false,
      error: erreurMessage(
        current.error,
        "Les photos de ce bien sont injoignables.",
      ),
    };
  }

  const allowedIds = new Set((current.data ?? []).map((photo) => photo.id));
  const ordered = resolvePhotoOrder(orderTokens, newPhotoIds, allowedIds);

  return applyPhotoOrder(supabase, propertyId, ordered);
}

/**
 * Supprime un bien, ses photos en base et les fichiers du bucket.
 *
 * L'ordre est le reflet de ce qu'il faut préserver en cas de panne : le fichier
 * part en premier, car un fichier orphelin ne s'affiche nulle part, alors qu'une
 * ligne `property_photos` sans fichier afficherait une image cassée. Si le
 * retrait des fichiers échoue, la ligne est laissée en place pour permettre un
 * nouvel essai. La suppression de la ligne supprime ensuite toutes les photos
 * en base par `ON DELETE CASCADE`.
 */
export async function deleteProperty(id: string): Promise<WriteResult> {
  const supabase = await createClient();

  const photos = await supabase
    .from("property_photos")
    .select("url")
    .eq("property_id", id);

  if (photos.error) {
    return {
      ok: false,
      error: erreurMessage(photos.error, "Ce bien est injoignable."),
    };
  }

  const paths = storedPaths((photos.data ?? []).map((photo) => photo.url));

  const removed = await removeStoredFiles(supabase, paths);
  if (!removed.ok) {
    return {
      ok: false,
      error: "Les photos n'ont pas pu être supprimées du stockage. Réessayez.",
    };
  }

  // `delete().select()` plutôt que `delete()` seul : une ligne exclue par une
  // politique RLS ne produit AUCUNE erreur, la suppression est simplement sans
  // effet. Le nombre de lignes renvoyées est donc le seul moyen de savoir si
  // elle a réellement eu lieu — sans cette vérification, une suppression
  // inopérante serait rapportée comme une réussite.
  const { data: supprime, error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return {
      ok: false,
      error: erreurMessage(error, "Le bien n'a pas pu être supprimé."),
    };
  }

  if (!supprime || supprime.length === 0) {
    return {
      ok: false,
      error:
        "Le bien n'existe pas, ou ce compte administrateur n'a plus le droit de le supprimer.",
    };
  }

  return { ok: true, id };
}

/** Supprime une photo : le fichier du bucket, puis la ligne en base. */
export async function deletePhoto(photoId: string): Promise<PhotoDeleteResult> {
  const supabase = await createClient();

  const photo = await supabase
    .from("property_photos")
    .select("id, property_id, url")
    .eq("id", photoId)
    .maybeSingle();

  if (photo.error) {
    return {
      ok: false,
      error: erreurMessage(photo.error, "Cette photo est injoignable."),
    };
  }

  if (!photo.data) {
    return { ok: false, error: "Cette photo n'existe plus." };
  }

  const paths = storedPaths([photo.data.url]);

  const removed = await removeStoredFiles(supabase, paths);
  if (!removed.ok) {
    return {
      ok: false,
      error: "Le fichier n'a pas pu être supprimé du stockage. Réessayez.",
    };
  }

  // Même raison que pour un bien : on relit la ligne supprimée, faute de quoi
  // une suppression neutralisée par la RLS passerait pour un succès.
  const { data: supprime, error } = await supabase
    .from("property_photos")
    .delete()
    .eq("id", photoId)
    .eq("property_id", photo.data.property_id)
    .select("id");

  if (error) {
    return {
      ok: false,
      error: erreurMessage(error, "La photo n'a pas pu être supprimée."),
    };
  }

  if (!supprime || supprime.length === 0) {
    return { ok: false, error: "Cette photo n'a pas pu être supprimée." };
  }

  await resequencePhotos(supabase, photo.data.property_id);

  return { ok: true, propertyId: photo.data.property_id };
}

/**
 * Réenregistre l'ordre des photos.
 *
 * Seuls les identifiants appartenant au bien sont mis à jour : la liste est
 * d'abord recoupée avec les photos réellement en base, pour qu'un identifiant
 * étranger ne puisse pas être repositionné.
 */
export async function reorderPhotos(
  propertyId: string,
  orderedIds: string[],
): Promise<WriteResult> {
  const supabase = await createClient();

  const existing = await supabase
    .from("property_photos")
    .select("id")
    .eq("property_id", propertyId);

  if (existing.error) {
    return {
      ok: false,
      error: erreurMessage(existing.error, "Ce bien est injoignable."),
    };
  }

  const autorisees = new Set((existing.data ?? []).map((photo) => photo.id));
  const ordonnees = orderedIds.filter((id) => autorisees.has(id));

  // Les photos non listées gardent leur place relative, à la suite.
  const restantes = [...autorisees].filter((id) => !ordonnees.includes(id));
  const finale = [...ordonnees, ...restantes];

  for (const [position, id] of finale.entries()) {
    const { error } = await supabase
      .from("property_photos")
      .update({ position })
      .eq("id", id)
      .eq("property_id", propertyId);

    if (error) {
      return {
        ok: false,
        error: erreurMessage(error, "L'ordre des photos est inchangé."),
      };
    }
  }

  return { ok: true, id: propertyId };
}

// =============================================================================
// Stockage
// =============================================================================

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// En cas d'échec, `ids` contient les lignes DÉJÀ insérées avant l'incident :
// l'appelant doit pouvoir les supprimer, sinon il reste des photos en base
// pointant vers des fichiers retirés du bucket.
type UploadOutcome =
  | { ok: true; paths: string[]; ids: string[] }
  | { ok: false; error: string; paths: string[]; ids: string[] };

/**
 * Dépose les fichiers dans le bucket puis enregistre une ligne par photo.
 *
 * Le chemin est `properties/{id-du-bien}/{fichier}` : le nom du fichier étant
 * nettoyé avant l'envoi, l'URL publique est la réécriture exacte de ce chemin,
 * et la suppression retrouvera le même chemin sans ambiguïté.
 *
 * @returns les identifiants des lignes créées, dans l'ordre d'envoi, pour que
 *   l'appelant puisse replacer les nouvelles photos à la position voulue.
 */
async function uploadPhotos(
  supabase: SupabaseClient,
  propertyId: string,
  files: File[],
  startPosition: number,
): Promise<UploadOutcome> {
  const paths: string[] = [];
  const ids: string[] = [];

  for (const [index, file] of files.entries()) {
    // La photo est ré-encodée en WebP avant l'envoi : le chemin est calculé à
    // partir du nom APRÈS conversion, pour que l'extension du fichier stocké,
    // celle de l'URL en base et celle reconstruite à la suppression restent
    // identiques.
    const image = await prepareImageForUpload(file);

    // Le discriminant garantit un chemin unique, même si deux fichiers
    // sélectionnés portent le même nom.
    const path = photoStoragePath(
      propertyId,
      image.name,
      crypto.randomUUID().slice(0, 8),
    );

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, image.body, {
        contentType: image.contentType,
        // L'URL du fichier est immuable : un cache long évite de le retélécharger
        // à chaque visite d'une annonce, et il est invalidé par le nom unique.
        cacheControl: "31536000",
        upsert: false,
      });

    if (error) {
      return {
        ok: false,
        error: `« ${file.name} » n'a pas pu être envoyé : ${error.message}`,
        paths,
        ids,
      };
    }

    paths.push(path);

    // `getPublicUrl` ne peut pas échouer : le bucket étant public, l'adresse
    // est calculée localement à partir du chemin, sans appel réseau.
    const { data: publicUrl } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    if (!publicUrl?.publicUrl) {
      return {
        ok: false,
        error: `« ${file.name} » a été envoyé mais son adresse est introuvable.`,
        paths,
        ids,
      };
    }

    const { data: inserted, error: insertError } = await supabase
      .from("property_photos")
      .insert({
        property_id: propertyId,
        url: publicUrl.publicUrl,
        position: startPosition + index,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return {
        ok: false,
        error: `« ${file.name} » n'a pas pu être associé au bien : ${insertError?.message ?? "raison inconnue"}`,
        paths,
        ids,
      };
    }

    ids.push(inserted.id);
  }

  return { ok: true, paths, ids };
}

/**
 * Applique l'ordre d'affichage choisi par l'administrateur.
 *
 * L'ordre est transmis sous forme de jetons plutôt que d'identifiants : au
 * moment où le formulaire est soumis, les photos déjà enregistrées ont un id
 * mais les nouvelles viennent d'être déposées et n'en ont pas encore été
 * renvoyé au navigateur. Chaque jeton est donc soit `photo:{id}` — une photo
 * existante — soit `file:{index}` — la n-ième photo du lot déposé, dans
 * l'ordre d'envoi. Les identifiants inconnus sont ignorés, et les photos non
 * citées sont conservées à la suite plutôt que perdues.
 */
export function resolvePhotoOrder(
  tokens: string[],
  newPhotoIds: string[],
  allowedIds: Set<string>,
): string[] {
  const resolved: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    let id: string | undefined;

    if (token.startsWith("photo:")) {
      id = token.slice("photo:".length);
    } else if (token.startsWith("file:")) {
      const index = Number.parseInt(token.slice("file:".length), 10);
      if (Number.isInteger(index) && index >= 0 && index < newPhotoIds.length) {
        id = newPhotoIds[index];
      }
    }

    if (id && allowedIds.has(id) && !seen.has(id)) {
      seen.add(id);
      resolved.push(id);
    }
  }

  for (const id of allowedIds) {
    if (!seen.has(id)) resolved.push(id);
  }

  return resolved;
}

/** Écrit la position de chaque photo dans l'ordre résolu. */
async function applyPhotoOrder(
  supabase: SupabaseClient,
  propertyId: string,
  ids: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const [position, id] of ids.entries()) {
    const { error } = await supabase
      .from("property_photos")
      .update({ position })
      .eq("id", id)
      .eq("property_id", propertyId);

    if (error) {
      return {
        ok: false,
        error: erreurMessage(
          error,
          "L'ordre des photos n'a pas pu être enregistré.",
        ),
      };
    }
  }

  return { ok: true };
}

/** Annule une création : fichiers déposés puis ligne du bien. */
async function rollbackCreate(
  supabase: SupabaseClient,
  propertyId: string,
  paths: string[],
): Promise<void> {
  await removeStoredFiles(supabase, paths);
  // La suppression en base emporte les lignes `property_photos` déjà insérées.
  await supabase.from("properties").delete().eq("id", propertyId);
}

/**
 * Retire des fichiers du bucket.
 *
 * Une réponse « objet introuvable » est traitée comme un succès : le but
 * recherché — que le fichier n'existe plus — est atteint, et l'idempotence évite
 * qu'une seconde suppression échoue sur une photo déjà retirée.
 */
async function removeStoredFiles(
  supabase: SupabaseClient,
  paths: string[],
): Promise<{ ok: true } | { ok: false }> {
  if (paths.length === 0) return { ok: true };

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(paths);

  if (!error) return { ok: true };
  if (isNotFound(error)) return { ok: true };

  return { ok: false };
}

/**
 * Annule un lot de photos nouvellement déposées.
 *
 * Les fichiers ET les lignes `property_photos` doivent disparaître ensemble.
 * Retirer seulement les fichiers laisserait des lignes en base pointant vers
 * des objets absents du bucket : ces photos s'afficheraient cassées sur le site
 * public, et le compte de photos resterait faux.
 */
async function discardUploadedPhotos(
  supabase: SupabaseClient,
  ids: string[],
  paths: string[],
): Promise<void> {
  if (ids.length > 0) {
    await supabase.from("property_photos").delete().in("id", ids);
  }

  await removeStoredFiles(supabase, paths);
}

/** Comble les trous de `position` après une suppression. */
async function resequencePhotos(
  supabase: SupabaseClient,
  propertyId: string,
): Promise<void> {
  const { data } = await supabase
    .from("property_photos")
    .select("id, position")
    .eq("property_id", propertyId);

  const photos = [...(data ?? [])].sort((a, b) => a.position - b.position);

  for (const [position, photo] of photos.entries()) {
    if (photo.position === position) continue;
    await supabase
      .from("property_photos")
      .update({ position })
      .eq("id", photo.id)
      .eq("property_id", propertyId);
  }
}

// =============================================================================
// Utilitaires
// =============================================================================

/** Lit un champ texte du formulaire, en tolérant l'absence. */
function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Échappe les jokers `%` et `_` d'une recherche `ilike`. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Retrouve le chemin interne de chaque URL stockée, en ignorant les inconnues. */
function storedPaths(urls: string[]): string[] {
  const projectUrl = supabaseUrl();
  return urls
    .map((url) => photoPathFromUrl(url, projectUrl))
    .filter((path): path is string => path !== null);
}

/**
 * Supabase signale un objet déjà absent par un 404.
 *
 * `statusCode` est typé en `string` par la bibliothèque : les deux formes sont
 * donc comparées, pour ne pas dépendre de la valeur reçue.
 */
function isNotFound(error: {
  statusCode?: string | number;
  status?: string | number;
  message?: string;
}): boolean {
  const status = error.statusCode ?? error.status;
  return (
    String(status) === "404" ||
    /not found|introuvable|does not exist/i.test(error.message ?? "")
  );
}

/**
 * Message d'erreur renvoyé à l'admin.
 *
 * Le détail technique de PostgREST est conservé car il aide à diagnostiquer
 * (`violation of check constraint`, violation de politique RLS…), et la page
 * n'est accessible qu'à un administrateur connecté.
 */
function erreurMessage(
  error: { message?: string } | null,
  fallback: string,
): string {
  return error?.message ? `${fallback} (${error.message})` : fallback;
}
