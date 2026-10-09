import type { MetadataRoute } from "next";

import { listerBiensPublics } from "@/lib/properties-public";
import { siteConfig } from "@/lib/site";

/**
 * Le sitemap est régénéré périodiquement : le catalogue change quand
 * l'administrateur publie un bien, sans déploiement.
 */
export const revalidate = 3600;

const routesStatiques: MetadataRoute.Sitemap = [
  { url: `${siteConfig.url}/`, changeFrequency: "weekly", priority: 1 },
  {
    url: `${siteConfig.url}/immobilier`,
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    url: `${siteConfig.url}/cleaning`,
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    url: `${siteConfig.url}/a-propos`,
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: `${siteConfig.url}/contact`,
    changeFrequency: "monthly",
    priority: 0.7,
  },
];

/**
 * Sitemap des pages publiques et des fiches de biens publiées.
 *
 * La lecture du catalogue est isolée dans un `try/catch` : une base
 * momentanément injoignable ne doit pas faire échouer la génération du
 * sitemap, qui retombe alors sur les seules routes statiques.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let fiches: MetadataRoute.Sitemap = [];

  try {
    const biens = await listerBiensPublics();
    fiches = biens.map((bien) => ({
      url: `${siteConfig.url}/immobilier/${bien.id}`,
      lastModified: bien.created_at,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch {
    fiches = [];
  }

  return [...routesStatiques, ...fiches];
}
