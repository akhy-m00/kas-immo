import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

/**
 * `robots.txt` généré.
 *
 * L'espace admin et les pages de compte ne doivent pas être indexés : une
 * page de connexion dans les résultats de recherche n'apporte rien et
 * dilue le référencement des pages publiques.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/mon-compte",
        "/connexion",
        "/inscription",
        "/reinitialiser-mot-de-passe",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
