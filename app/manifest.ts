import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

/**
 * Manifeste web (`/manifest.webmanifest`) : nom, couleurs et icônes utilisés
 * quand le site est ajouté à l'écran d'accueil d'un téléphone.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    lang: "fr-SN",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#8e0b3f",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
