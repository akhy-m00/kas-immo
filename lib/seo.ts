import type { Metadata } from "next";

import type { PropertyWithPhotos } from "@/lib/properties";
import {
  cleaningContact,
  immobilierContact,
  siteConfig,
  socialLinks,
} from "@/lib/site";

/**
 * Référencement : métadonnées de page et données structurées (JSON-LD).
 *
 * Toutes les URL sont construites depuis `siteConfig.url`
 * (NEXT_PUBLIC_SITE_URL) : aucune adresse du site n'est écrite en dur.
 */

/** Titre complet affiché sur Google et dans les aperçus de lien. */
export const TITRE_SITE = `${siteConfig.name} — Immobilier & Nettoyage à Dakar`;

/** Mots-clés communs : la ville et les deux métiers. */
const MOTS_CLES_BASE = [
  "Keur Anta Services",
  "KAS",
  "Dakar",
  "Sénégal",
];

type OptionsPage = {
  /** Titre court : le gabarit du layout ajoute « | Keur Anta Services ». */
  titre: string;
  description: string;
  /** Chemin canonique, ex. `/immobilier`. */
  chemin: string;
  motsCles?: string[];
  /** `false` pour les pages de compte : visibles, mais pas indexées. */
  indexable?: boolean;
  /** Titre complet, sans gabarit (accueil). */
  titreAbsolu?: boolean;
  /**
   * Image de partage : la route `opengraph-image` de la section (ex.
   * `/immobilier/opengraph-image`). Par défaut, celle de l'accueil.
   */
  image?: { chemin: string; alt: string };
};

/**
 * Image de partage par défaut (`app/opengraph-image.tsx`).
 *
 * L'image est TOUJOURS déclarée explicitement : l'objet `openGraph` d'une page
 * efface l'image héritée du layout, et il l'emporte aussi sur le fichier
 * `opengraph-image` de la section. Chaque section indique donc la sienne.
 */
const IMAGE_ACCUEIL = {
  chemin: "/opengraph-image",
  alt: `${siteConfig.name} — Immobilier et nettoyage professionnel à Dakar`,
};

/**
 * Métadonnées d'une page publique : titre, description, URL canonique et
 * aperçus de partage (Open Graph, X).
 *
 * ⚠️ L'objet `openGraph` d'une page REMPLACE celui du layout, il ne le
 * complète pas : `siteName`, `locale` et `type` sont donc répétés ici. L'image
 * vient des fichiers `opengraph-image` (le plus proche dans l'arborescence),
 * jamais de cet objet.
 *
 * L'URL canonique est indispensable sur `/immobilier` : chaque combinaison de
 * filtres (`?type=…&prixMax=…`) est sinon vue comme une page distincte.
 */
export function metadataPage({
  titre,
  description,
  chemin,
  motsCles = [],
  indexable = true,
  titreAbsolu = false,
  image = IMAGE_ACCUEIL,
}: OptionsPage): Metadata {
  const titreComplet = titreAbsolu ? titre : `${titre} | ${siteConfig.name}`;
  const images = [
    {
      url: image.chemin,
      width: 1200,
      height: 630,
      alt: image.alt,
      type: "image/png",
    },
  ];

  return {
    title: titreAbsolu ? { absolute: titre } : titre,
    description,
    keywords: [...motsCles, ...MOTS_CLES_BASE],
    alternates: { canonical: chemin },
    openGraph: {
      type: "website",
      locale: "fr_SN",
      siteName: siteConfig.name,
      url: chemin,
      title: titreComplet,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: titreComplet,
      description,
      images,
    },
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  };
}

// ---------------------------------------------------------------------------
// Données structurées (schema.org)
// ---------------------------------------------------------------------------

const ID_ORGANISATION = `${siteConfig.url}/#organisation`;
const ID_SITE = `${siteConfig.url}/#site`;

/** `tel:+221338050580` → `+221338050580`. */
function telephone(href: string): string {
  return href.replace(/^tel:/, "");
}

const ADRESSE = {
  "@type": "PostalAddress",
  addressLocality: "Dakar",
  addressCountry: "SN",
} as const;

/**
 * L'entreprise et le site, présents sur toutes les pages (layout) : nom,
 * logo, téléphones, réseaux sociaux, et ses deux pôles.
 */
export function jsonLdSite() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": ID_SITE,
        url: siteConfig.url,
        name: siteConfig.name,
        alternateName: siteConfig.shortName,
        description: siteConfig.description,
        inLanguage: "fr-SN",
        publisher: { "@id": ID_ORGANISATION },
      },
      {
        "@type": "Organization",
        "@id": ID_ORGANISATION,
        name: siteConfig.name,
        legalName: siteConfig.legalName,
        alternateName: siteConfig.shortName,
        url: siteConfig.url,
        description: siteConfig.description,
        logo: {
          "@type": "ImageObject",
          url: `${siteConfig.url}/icon.png`,
          width: 512,
          height: 512,
        },
        image: `${siteConfig.url}/opengraph-image`,
        address: ADRESSE,
        areaServed: { "@type": "City", name: "Dakar" },
        sameAs: socialLinks.map((lien) => lien.href),
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer service",
            name: immobilierContact.name,
            telephone: telephone(immobilierContact.mobile.href),
            areaServed: "SN",
            availableLanguage: ["French"],
          },
          {
            "@type": "ContactPoint",
            contactType: "customer service",
            name: cleaningContact.name,
            telephone: telephone(cleaningContact.phones[0].href),
            areaServed: "SN",
            availableLanguage: ["French"],
          },
        ],
        department: [
          {
            "@type": "RealEstateAgent",
            "@id": `${siteConfig.url}/immobilier#agence`,
            name: immobilierContact.name,
            url: `${siteConfig.url}/immobilier`,
            image: `${siteConfig.url}/immobilier/opengraph-image`,
            telephone: telephone(immobilierContact.fixedLine.href),
            address: ADRESSE,
            areaServed: { "@type": "City", name: "Dakar" },
            knowsAbout: immobilierContact.services,
          },
          {
            "@type": "ProfessionalService",
            "@id": `${siteConfig.url}/cleaning#service`,
            name: cleaningContact.name,
            url: `${siteConfig.url}/cleaning`,
            image: `${siteConfig.url}/cleaning/opengraph-image`,
            telephone: telephone(cleaningContact.phones[0].href),
            address: ADRESSE,
            areaServed: { "@type": "City", name: "Dakar" },
            knowsAbout: cleaningContact.services.map(
              (service) => `Nettoyage ${service.toLowerCase()}`,
            ),
          },
        ],
      },
    ],
  };
}

/** Fil d'Ariane d'une page, du plus général au plus précis. */
export function jsonLdFilAriane(etapes: { nom: string; chemin: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: etapes.map((etape, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: etape.nom,
      item: `${siteConfig.url}${etape.chemin}`,
    })),
  };
}

/** Annonce d'un bien : prix, photos, localisation et disponibilité. */
export function jsonLdBien(bien: PropertyWithPhotos) {
  const url = `${siteConfig.url}/immobilier/${bien.id}`;

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "@id": `${url}#annonce`,
    url,
    name: bien.title,
    description: bien.description || undefined,
    datePosted: bien.created_at,
    image: bien.photos.map((photo) => photo.url),
    contentLocation: {
      "@type": "Place",
      name: bien.location,
      address: { ...ADRESSE, streetAddress: bien.location },
    },
    offers: {
      "@type": "Offer",
      price: bien.price,
      priceCurrency: "XOF",
      businessFunction:
        bien.transaction_type === "location"
          ? "http://purl.org/goodrelations/v1#LeaseOut"
          : "http://purl.org/goodrelations/v1#Sell",
      availability:
        bien.status === "disponible"
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      seller: { "@id": ID_ORGANISATION },
    },
  };
}

/**
 * Sérialise des données structurées pour `<script type="application/ld+json">`.
 *
 * `<` est échappé : un titre de bien contenant `</script>` fermerait sinon la
 * balise et permettrait une injection de script (recommandation Next.js).
 */
export function serialiserJsonLd(donnees: unknown): string {
  return JSON.stringify(donnees).replace(/</g, "\\u003c");
}
