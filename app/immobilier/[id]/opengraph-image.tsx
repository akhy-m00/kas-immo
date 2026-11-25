import { imageOg, TAILLE_OG } from "@/lib/og/cartes";
import { photoDistante } from "@/lib/og/ressources";
import {
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
  formatFcfa,
} from "@/lib/properties";
import { trouverBienPublic } from "@/lib/properties-public";

/**
 * Image de partage d'une fiche : la première photo du bien, son titre, sa
 * localisation et son prix. C'est l'aperçu qui s'affiche quand un lien de
 * bien est envoyé sur WhatsApp, Facebook ou Instagram.
 *
 * Même durée de cache que la fiche : une modification de prix ou de photo se
 * reflète au plus tard après ce délai.
 */
export const revalidate = 300;
export const alt = "Bien immobilier proposé par KAS Immobilier à Dakar";
export const size = TAILLE_OG;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bien = await trouverBienPublic(id);

  if (!bien) {
    return imageOg({
      surtitre: "KAS Immobilier · Dakar",
      titre: "Louer, vendre, acheter en toute confiance",
      logo: "immobilier",
      fond: "fond-immobilier",
    });
  }

  const premierePhoto = bien.photos[0]?.url;
  const photo = premierePhoto
    ? await photoDistante(premierePhoto, TAILLE_OG.width, TAILLE_OG.height)
    : null;

  const transaction =
    bien.transaction_type === "location" ? "À louer" : "À vendre";

  return imageOg({
    surtitre: `${PROPERTY_TYPE_LABELS[bien.type]} · ${transaction}`,
    titre: bien.title,
    sousTitre: bien.location,
    miseEnAvant: formatFcfa(bien.price),
    pastilles:
      bien.status === "disponible"
        ? [TRANSACTION_TYPE_LABELS[bien.transaction_type]]
        : [PROPERTY_STATUS_LABELS[bien.status]],
    logo: "immobilier",
    fond: photo ? { dataUri: photo } : "fond-immobilier",
  });
}
