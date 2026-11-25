import { imageOg, TAILLE_OG } from "@/lib/og/cartes";
import { immobilierContact } from "@/lib/site";

/** Image de partage du catalogue `/immobilier`. */
export const alt = "KAS Immobilier — location, vente et achat de biens à Dakar";
export const size = TAILLE_OG;
export const contentType = "image/png";

export default function Image() {
  return imageOg({
    surtitre: "KAS Immobilier · Dakar",
    titre: "Louer, vendre, acheter en toute confiance",
    sousTitre: "Appartements, maisons, terrains et bureaux sélectionnés à Dakar.",
    pastilles: immobilierContact.services,
    logo: "immobilier",
    fond: "fond-immobilier",
  });
}
