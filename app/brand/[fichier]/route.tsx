import {
  CARTE_ACCUEIL,
  imageBanniere,
  imageOg,
  imageProfil,
  imagePublication,
} from "@/lib/og/cartes";

/**
 * Kit de marque : visuels à télécharger pour les profils des réseaux sociaux.
 *
 *   /brand/profil-immobilier.png   1080×1080  photo de profil KAS Immobilier
 *   /brand/profil-cleaning.png     1080×1080  photo de profil KAS Cleaning
 *   /brand/banniere.png            1500×500   bannière X / LinkedIn / Facebook
 *   /brand/publication.png         1080×1350  publication Instagram
 *   /brand/partage.png             1200×630   aperçu de lien générique
 *
 * Générés depuis les mêmes gabarits que les images Open Graph
 * (`lib/og/cartes.tsx`) : un changement de logo ou de couleur se répercute
 * partout. Prérendus au build (liste fermée), puis servis en statique.
 */
const VISUELS = {
  "profil-immobilier.png": () => imageProfil("immobilier"),
  "profil-cleaning.png": () => imageProfil("cleaning"),
  "banniere.png": () => imageBanniere(),
  "publication.png": () => imagePublication(),
  "partage.png": () => imageOg(CARTE_ACCUEIL),
} as const;

type Fichier = keyof typeof VISUELS;

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(VISUELS).map((fichier) => ({ fichier }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fichier: string }> },
) {
  const { fichier } = await params;
  const generer = VISUELS[fichier as Fichier];

  if (!generer) {
    return new Response("Introuvable", { status: 404 });
  }

  return generer();
}
