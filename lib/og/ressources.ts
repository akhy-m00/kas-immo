import { readFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

/**
 * Ressources des images de partage (Open Graph) et du kit de marque.
 *
 * Les fichiers viennent de `assets/` (hors `public/`) : polices au format WOFF
 * — `ImageResponse` n'accepte ni WOFF2 ni les polices variables — et visuels
 * PNG/JPEG produits par `scripts/generate-og-assets.mjs`, car le WebP du site
 * n'est pas décodé par le moteur de rendu.
 *
 * Chaque fichier n'est lu qu'une fois par processus : les promesses sont
 * gardées en mémoire, ce qui évite de relire le disque à chaque image.
 */

const racine = process.cwd();
const cache = new Map<string, Promise<Buffer>>();

function lire(chemin: string): Promise<Buffer> {
  let fichier = cache.get(chemin);
  if (!fichier) {
    fichier = readFile(join(racine, chemin));
    cache.set(chemin, fichier);
  }
  return fichier;
}

/** Couleurs de la marque, reprises de `app/globals.css`. */
export const COULEURS = {
  bordeaux: "#8e0b3f",
  bordeauxClair: "#f3a3bf",
  encre: "#14040b",
  blanc: "#ffffff",
  rose: "#f7e4eb",
} as const;

export type NomVisuel =
  | "logo-immobilier"
  | "logo-immobilier-dark"
  | "logo-cleaning"
  | "logo-cleaning-dark"
  | "fond-accueil"
  | "fond-immobilier"
  | "fond-cleaning";

const FICHIERS: Record<NomVisuel, { fichier: string; mime: string }> = {
  "logo-immobilier": { fichier: "logo-immobilier.png", mime: "image/png" },
  "logo-immobilier-dark": { fichier: "logo-immobilier-dark.png", mime: "image/png" },
  "logo-cleaning": { fichier: "logo-cleaning.png", mime: "image/png" },
  "logo-cleaning-dark": { fichier: "logo-cleaning-dark.png", mime: "image/png" },
  "fond-accueil": { fichier: "fond-accueil.jpg", mime: "image/jpeg" },
  "fond-immobilier": { fichier: "fond-immobilier.jpg", mime: "image/jpeg" },
  "fond-cleaning": { fichier: "fond-cleaning.jpg", mime: "image/jpeg" },
};

/** Un visuel de `assets/og/`, en data URI prête pour `<img src>`. */
export async function visuel(nom: NomVisuel): Promise<string> {
  const { fichier, mime } = FICHIERS[nom];
  const data = await lire(`assets/og/${fichier}`);
  return `data:${mime};base64,${data.toString("base64")}`;
}

/** Polices de la marque : Plus Jakarta Sans (titres) et Inter (texte). */
export async function polices() {
  const [titre700, titre800, texte500, texte600] = await Promise.all([
    lire("assets/fonts/plus-jakarta-sans-latin-700-normal.woff"),
    lire("assets/fonts/plus-jakarta-sans-latin-800-normal.woff"),
    lire("assets/fonts/inter-latin-500-normal.woff"),
    lire("assets/fonts/inter-latin-600-normal.woff"),
  ]);

  return [
    { name: "Jakarta", data: titre700, weight: 700 as const, style: "normal" as const },
    { name: "Jakarta", data: titre800, weight: 800 as const, style: "normal" as const },
    { name: "Inter", data: texte500, weight: 500 as const, style: "normal" as const },
    { name: "Inter", data: texte600, weight: 600 as const, style: "normal" as const },
  ];
}

/**
 * Télécharge une photo distante (Supabase Storage) et la convertit en JPEG
 * recadré, ou renvoie `null` si elle est indisponible.
 *
 * La conversion est nécessaire : les photos des biens sont stockées en WebP,
 * que `ImageResponse` ne sait pas afficher. Un échec ne doit jamais casser
 * l'image de partage : l'appelant retombe alors sur un fond de marque.
 */
export async function photoDistante(
  url: string,
  largeur: number,
  hauteur: number,
): Promise<string | null> {
  try {
    const reponse = await fetch(url, { next: { revalidate: 3600 } });
    if (!reponse.ok) return null;

    const source = Buffer.from(await reponse.arrayBuffer());
    const jpeg = await sharp(source)
      .resize(largeur, hauteur, { fit: "cover" })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}
