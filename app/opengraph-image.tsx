import { CARTE_ACCUEIL, imageOg, TAILLE_OG } from "@/lib/og/cartes";
import { siteConfig } from "@/lib/site";

/**
 * Image de partage par défaut : accueil, et toute page qui n'a pas la sienne
 * (À propos, Contact…). Générée au build, puis servie en fichier statique.
 */
export const alt = `${siteConfig.name} — Immobilier et nettoyage professionnel à Dakar`;
export const size = TAILLE_OG;
export const contentType = "image/png";

export default function Image() {
  return imageOg(CARTE_ACCUEIL);
}
