import type {
  Property,
  PropertyPhoto,
  PropertyStatus,
  PropertyType,
  TransactionType,
} from "@/lib/supabase/database.types";

/**
 * Domaine « biens immobiliers » : libellés, formatage et chemins de stockage.
 *
 * Ce module est volontairement importable depuis un composant client : il ne
 * dépend d'aucun module serveur (`next/headers`, client Supabase serveur).
 * L'accès aux données vit dans `lib/properties-admin.ts`.
 */

/** Bucket Supabase qui contient les photos des biens. */
export const STORAGE_BUCKET = "properties";

/**
 * Premier segment du chemin d'un fichier dans le bucket.
 *
 * Le chemin complet est `properties/{id-du-bien}/{nom-du-fichier}`. Le nom du
 * bucket est déjà `properties` : ce préfixe sert à regrouper tous les biens dans
 * un même dossier et laisse la place à d'autres namespaces (`logos/`, `cleaning/`)
 * si le bucket est étendu plus tard.
 */
export const PHOTO_PATH_PREFIX = "properties";

/** Formats acceptés pour une photo de bien. */
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

/** Types MIME acceptés, pour le contrôle avant envoi. */
export const PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/** Taille maximale par photo : 5 Mo. */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/** Nombre maximum de photos par bien. */
export const PHOTO_MAX_COUNT = 12;

type Option<T extends string> = { value: T; label: string };

export const PROPERTY_TYPES: Option<PropertyType>[] = [
  { value: "appartement", label: "Appartement" },
  { value: "maison", label: "Maison" },
  { value: "terrain", label: "Terrain" },
  { value: "bureau", label: "Bureau" },
];

export const TRANSACTION_TYPES: Option<TransactionType>[] = [
  { value: "location", label: "Location" },
  { value: "vente", label: "Vente" },
];

export const PROPERTY_STATUSES: Option<PropertyStatus>[] = [
  { value: "disponible", label: "Disponible" },
  { value: "loue", label: "Loué" },
  { value: "vendu", label: "Vendu" },
];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  appartement: "Appartement",
  maison: "Maison",
  terrain: "Terrain",
  bureau: "Bureau",
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  location: "Location",
  vente: "Vente",
};

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  disponible: "Disponible",
  loue: "Loué",
  vendu: "Vendu",
};

export const STATUS_VALUES = PROPERTY_STATUSES.map((item) => item.value);
export const TYPE_VALUES = PROPERTY_TYPES.map((item) => item.value);
export const TRANSACTION_VALUES = TRANSACTION_TYPES.map((item) => item.value);

/** Un bien et ses photos, triées dans l'ordre d'affichage. */
export type PropertyWithPhotos = Property & { photos: PropertyPhoto[] };

/**
 * Prix formaté en francs CFA, ex. `1 250 000 FCFA`.
 *
 * Le FCFA n'a pas de centimes et la colonne est un entier : aucun arrondi
 * n'est nécessaire, le formatage ne fait qu'ajouter les séparateurs de
 * milliers. `fr-FR` utilise une espace fine insécable comme séparateur, ce qui
 * correspond à l'usage local.
 */
export function formatFcfa(value: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
}

/**
 * Nettoie un nom de fichier pour le stocker dans le bucket.
 *
 * On ne garde que des caractères sûrs : le chemin d'un objet Supabase est
 * sensible à `/`, aux accents et aux espaces, qui seraient réencodés puis
 * décodés de façon différente à la suppression. Réduire le nom à `[a-z0-9-_.]`
 * rend l'URL stockée et le chemin supprimé strictement identiques.
 */
export function sanitizeFileName(name: string): string {
  // L'extension est retirée du nom d'origine AVANT le nettoyage : sinon le
  // point qui la sépare deviendrait un tiret, et l'extension se retrouverait
  // répétée dans le nom (« photo-ecran-2026-png.png »).
  const match = /\.([a-z0-9]+)$/i.exec(name);
  const stem = match ? name.slice(0, match.index) : name;
  const extension = match?.[1]?.toLowerCase() ?? "jpg";

  const safeStem = stem
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);

  const safeExtension = ["jpg", "jpeg", "png", "webp", "avif"].includes(
    extension,
  )
    ? extension
    : "jpg";

  return `${safeStem || "photo"}.${safeExtension}`;
}

/** Chemin d'un fichier dans le bucket : `properties/{id-du-bien}/{fichier}`. */
export function photoStoragePath(
  propertyId: string,
  fileName: string,
  discriminant?: string,
): string {
  const nom = sanitizeFileName(fileName);

  // Deux fichiers sélectionnés portent très souvent le même nom — `photo.jpg`
  // depuis deux dossiers différents, ou deux `IMG_0001.jpg` d'un même appareil.
  // Sans suffixe, le second envoi viserait le chemin du premier et échouerait
  // (`upsert: false`), ce qui ferait échouer la création entière. Le
  // discriminant rend le chemin unique, y compris par rapport aux envois
  // précédents du même bien.
  return discriminant
    ? `${PHOTO_PATH_PREFIX}/${propertyId}/${discriminant}-${nom}`
    : `${PHOTO_PATH_PREFIX}/${propertyId}/${nom}`;
}

/**
 * Retrouve le chemin d'un fichier dans le bucket à partir de son URL publique.
 *
 * `property_photos.url` stocke l'URL publique complète. Supabase en dérive le
 * chemin de façon déterministe, mais l'inverse (passer d'une URL à un chemin)
 * n'est pas fourni par la bibliothèque : on retire donc le préfixe connu.
 *
 * @returns le chemin interne, ou `null` si l'URL ne vient pas de ce bucket —
 *   dans ce cas le fichier est laissé en place plutôt que de risquer la
 *   suppression d'un objet sans rapport.
 */
export function photoPathFromUrl(
  url: string,
  projectUrl: string,
): string | null {
  const base = `${projectUrl}/storage/v1/object/public/${STORAGE_BUCKET}/`;

  if (!url.startsWith(base)) return null;

  const path = url.slice(base.length);
  return path ? decodeURIComponent(path) : null;
}

/** Message d'erreur lisible pour un fichier refusé. */
export function describePhotoError(file: File): string | null {
  if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
    return `« ${file.name} » n'est pas une image (JPEG, PNG, WebP ou AVIF).`;
  }

  if (file.size > PHOTO_MAX_BYTES) {
    return `« ${file.name} » dépasse 5 Mo.`;
  }

  return null;
}
