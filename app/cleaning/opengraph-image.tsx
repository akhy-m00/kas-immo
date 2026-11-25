import { imageOg, TAILLE_OG } from "@/lib/og/cartes";
import { cleaningContact } from "@/lib/site";

/** Image de partage de `/cleaning`. */
export const alt = "KAS Cleaning — nettoyage professionnel à Dakar";
export const size = TAILLE_OG;
export const contentType = "image/png";

export default function Image() {
  return imageOg({
    surtitre: "KAS Cleaning · Dakar",
    titre: "Un service de nettoyage efficace",
    sousTitre: "Appartements, maisons, bureaux et immeubles, nettoyés par des professionnels.",
    pastilles: cleaningContact.services,
    logo: "cleaning",
    fond: "fond-cleaning",
  });
}
