/**
 * Compression des photos avant dépôt dans le stockage.
 *
 * Les photos arrivent en PNG ou JPEG, souvent de 1 Mo. Elles sont ré-encodées
 * en WebP avant l'envoi : le poids est divisé par environ 7, et surtout le
 * serveur n'a plus à télécharger un mégaoctet pour optimiser une image, ce qui
 * était la source des erreurs 500 quand la liaison vers le stockage ralentissait.
 *
 * Le module ne lève jamais : si `sharp` est absent, ou si la conversion
 * n'améliore rien, le fichier d'origine est déposé tel quel. Une photo doit
 * toujours pouvoir être enregistrée.
 */

/** Qualité WebP retenue. 78 est le meilleur compromis taille / fidélité. */
const WEBP_QUALITY = 78;

/**
 * `sharp` est une dépendance optionnelle de Next.js : elle peut manquer selon
 * la plateforme ou une installation sans dépendances optionnelles. Elle est
 * donc chargée à la demande, et son absence est tolérée.
 */
type Sharp = typeof import("sharp").default;

let sharpCharge: Promise<Sharp | null> | null = null;

function chargerSharp(): Promise<Sharp | null> {
  sharpCharge ??= import("sharp")
    .then((module) => module.default)
    .catch(() => null);
  return sharpCharge;
}

/** Contenu prêt à être déposé : les octets, le nom et le type à annoncer. */
export type PreparedImage = {
  /** Octets à transmettre au bucket. */
  body: Buffer;
  /** Nom du fichier à utiliser, avec l'extension correspondant au contenu. */
  name: string;
  /** Type MIME à déclarer au stockage. */
  contentType: string;
  /** `false` si le fichier d'origine a été déposé tel quel. */
  converted: boolean;
};

/** Remplace l'extension d'un nom de fichier par celle du contenu converti. */
function avecExtension(name: string, extension: string): string {
  const stem = name.replace(/\.[^.]+$/, "");
  return `${stem || "photo"}.${extension}`;
}

/**
 * Ré-encode une photo en WebP, si cela vaut la peine.
 *
 * Ne touche pas aux images déjà en WebP : les ré-encoder coûte du temps
 * pour un gain nul. Conserve l'orientation EXIF (`.rotate()` sans argument) :
 * sans cela, une photo prise en portrait s'afficherait couchée. La conversion
 * n'est retenue que si elle allège réellement le fichier.
 */
export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  const original = Buffer.from(await file.arrayBuffer());

  const inchangé: PreparedImage = {
    body: original,
    name: file.name,
    contentType: file.type || "application/octet-stream",
    converted: false,
  };

  // Déjà en WebP : rien à gagner, et le fichier est déjà léger.
  if (file.type === "image/webp") return inchangé;

  const sharp = await chargerSharp();
  if (!sharp) return inchangé;

  try {
    const webp = await sharp(original)
      .rotate()
      .webp({ quality: WEBP_QUALITY, effort: 4, smartSubsample: true })
      .toBuffer();

    // Un PNG déjà minuscule peut peser plus lourd en WebP : dans ce cas on
    // conserve l'original plutôt que de l'agrandir.
    if (webp.byteLength >= original.byteLength) return inchangé;

    return {
      body: webp,
      name: avecExtension(file.name, "webp"),
      contentType: "image/webp",
      converted: true,
    };
  } catch {
    // Image illisible ou format non supporté : l'original part tel quel.
    return inchangé;
  }
}

/**
 * Convertit un buffer déjà téléchargé (migration de l'existant).
 *
 * Renvoie `null` si le contenu n'est pas convertible, afin que l'appelant
 * laisse le fichier d'origine en place.
 */
export async function toWebp(data: Buffer): Promise<{ webp: Buffer } | null> {
  const sharp = await chargerSharp();
  if (!sharp) return null;
  try {
    const webp = await sharp(data)
      .rotate()
      .webp({ quality: WEBP_QUALITY, effort: 4, smartSubsample: true })
      .toBuffer();
    return webp.byteLength < data.byteLength ? { webp } : null;
  } catch {
    return null;
  }
}
