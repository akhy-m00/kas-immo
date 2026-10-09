import { sanitizeFileName } from "@/lib/properties";

/**
 * Constantes et chemins du pôle cleaning.
 *
 * Volontairement plus simple que `lib/properties.ts` : une prestation porte
 * une seule photo, il n'y a donc ni position, ni réordonnancement, ni vignette
 * multiple. Ce qui est commun aux deux pôles (nom du fichier, chemin dans le
 * bucket, types de fichiers acceptés) est réutilisé depuis `lib/properties.ts`
 * plutôt que recopié, pour qu'une correction soit appliquée aux deux.
 */

/** Bucket de stockage des photos des prestations. */
export const CLEANING_BUCKET = "cleaning";

/**
 * Premier segment du chemin d'un fichier dans le bucket.
 *
 * Le chemin complet est `cleaning/{id-du-service}/{nom-du-fichier}`. Comme pour
 * les biens, le préfixe sert à regrouper les fichiers du bucket dans un même
 * dossier et laisse la place à d'autres espaces de noms.
 */
export const CLEANING_PHOTO_PATH_PREFIX = "cleaning";

/** Formats acceptés pour la photo d'un service. */
export const CLEANING_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/** Taille maximale de la photo : 5 Mo, comme pour un bien. */
export const CLEANING_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/** Longueur maximale du titre, en caractères. */
export const CLEANING_TITLE_MAX = 120;

/** Longueur maximale de la description, en caractères. */
export const CLEANING_DESCRIPTION_MAX = 2000;

/** Longueur minimale du titre : en dessous, l'administration est refusée. */
export const CLEANING_TITLE_MIN = 3;

/**
 * Chemin d'une photo de service dans le bucket :
 * `cleaning/{id-du-service}/{fichier}`.
 *
 * Le discriminant joue le même rôle que pour les biens : deux photos choisies
 * portent très souvent le même nom, et sans suffixe la seconde viendrait
 * écraser la première — l'envoi échouerait puisque le chemin existe déjà.
 */
export function cleaningPhotoPath(
  serviceId: string,
  fileName: string,
  discriminant?: string,
): string {
  const nom = sanitizeFileName(fileName);

  return discriminant
    ? `${CLEANING_PHOTO_PATH_PREFIX}/${serviceId}/${discriminant}-${nom}`
    : `${CLEANING_PHOTO_PATH_PREFIX}/${serviceId}/${nom}`;
}

/**
 * Retrouve le chemin interne d'un fichier à partir de son URL publique.
 *
 * @returns le chemin, ou `null` si l'URL ne vient pas de ce bucket — le
 *   fichier est alors laissé en place, plutôt que de risquer la suppression
 *   d'un objet sans rapport.
 */
export function cleaningPhotoPathFromUrl(
  url: string,
  projectUrl: string,
): string | null {
  const base = `${projectUrl}/storage/v1/object/public/${CLEANING_BUCKET}/`;

  if (!url.startsWith(base)) return null;

  const path = url.slice(base.length);
  return path ? decodeURIComponent(path) : null;
}

/** Message d'erreur lisible pour une photo refusée. */
export function describeCleaningPhotoError(file: File): string | null {
  if (!(CLEANING_PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
    return `« ${file.name} » n'est pas une image (JPEG, PNG, WebP ou AVIF).`;
  }

  if (file.size > CLEANING_PHOTO_MAX_BYTES) {
    return `« ${file.name} » dépasse 5 Mo.`;
  }

  return null;
}

/**
 * Extrait d'une description longue, sans couper un mot au milieu.
 *
 * Le résumé alimente les cartes de l'espace admin, où la hauteur est bornée :
 * tronquer « nettoyage complet d'un appartement de trois pièces » en
 * « nettoyag… » serait illisible.
 */
export function resumeDescription(
  description: string | null,
  longueur = 140,
): string {
  if (!description) return "";

  const texte = description.replace(/\s+/g, " ").trim();
  if (texte.length <= longueur) return texte;

  const coupe = texte.slice(0, longueur);
  const dernierEspace = coupe.lastIndexOf(" ");

  return `${(dernierEspace > 0 ? coupe.slice(0, dernierEspace) : coupe).trimEnd()}…`;
}
