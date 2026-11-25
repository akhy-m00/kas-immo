import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

/**
 * `robots.txt` généré (`/robots.txt`).
 *
 * Seules les zones sans aucun contenu public sont bloquées : l'administration
 * et le retour d'authentification.
 *
 * Les pages de compte (`/connexion`, `/inscription`, `/mon-compte`,
 * `/reinitialiser-mot-de-passe`) ne sont volontairement PAS bloquées ici :
 * elles portent une balise `noindex`, et un robot ne peut lire cette balise
 * que s'il a le droit d'ouvrir la page. Les bloquer ferait apparaître leur URL
 * nue dans Google (« aucune information disponible »), puisqu'elles sont
 * liées depuis l'en-tête du site.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/auth/"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
