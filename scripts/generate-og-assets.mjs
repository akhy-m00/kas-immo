/**
 * Prépare les visuels utilisés par les images de partage (Open Graph) et le
 * kit de marque : `assets/og/`.
 *
 *   node scripts/generate-og-assets.mjs
 *
 * Pourquoi un dossier à part : `ImageResponse` (next/og) ne décode ni le WebP
 * ni l'AVIF, seulement le PNG et le JPEG. Les visuels du site étant en WebP
 * (`public/images/`), on en dérive ici des copies PNG/JPEG, redimensionnées au
 * strict nécessaire pour garder les images de partage légères.
 *
 * À relancer après tout changement de logo ou de photo de fond.
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

const racine = process.cwd();
const sortie = join(racine, "assets/og");
await mkdir(sortie, { recursive: true });

const src = (f) => join(racine, "public/images", f);

const taches = [
  // Logos : PNG pour conserver la transparence.
  [src("logo-kas-immobilier.webp"), "logo-immobilier.png", { width: 640 }, "png"],
  [src("logo-kas-immobilier-dark.webp"), "logo-immobilier-dark.png", { width: 640 }, "png"],
  [src("logo-kas-cleaning.webp"), "logo-cleaning.png", { width: 520 }, "png"],
  [src("logo-kas-cleaning-dark.webp"), "logo-cleaning-dark.png", { width: 520 }, "png"],
  // Fonds : JPEG, à la largeur d'une image Open Graph.
  [src("backgrounds/hero.webp"), "fond-accueil.jpg", { width: 1200 }, "jpg"],
  [src("backgrounds/immobilier.webp"), "fond-immobilier.jpg", { width: 1200 }, "jpg"],
  [src("backgrounds/cleaning.webp"), "fond-cleaning.jpg", { width: 1200 }, "jpg"],
];

for (const [entree, nom, resize, format] of taches) {
  const image = sharp(entree).resize(resize);
  const fichier = join(sortie, nom);
  if (format === "png") {
    await image.png({ compressionLevel: 9, palette: true }).toFile(fichier);
  } else {
    await image.jpeg({ quality: 78, mozjpeg: true }).toFile(fichier);
  }
  console.log("✓", nom);
}
