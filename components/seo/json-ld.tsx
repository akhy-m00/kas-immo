import { serialiserJsonLd } from "@/lib/seo";

/** Données structurées schema.org, lues par Google et les moteurs d'IA. */
export function JsonLd({ donnees }: { donnees: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialiserJsonLd(donnees) }}
    />
  );
}
