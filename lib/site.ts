export const siteConfig = {
  name: "Keur Anta Services",
  shortName: "KAS",
  legalName: "Keur Anta Services",
  city: "Dakar, Sénégal",
  url: "https://keurantaservices.sn",
  description:
    "Keur Anta Services (KAS) intervient à Dakar sur deux pôles : l’immobilier (location, vente, achat, gestion locative) et le nettoyage professionnel d’appartements, studios, maisons et bureaux.",
} as const;

export type NavItem = {
  label: string;
  href: string;
};

export const mainNav: NavItem[] = [
  { label: "Accueil", href: "/" },
  { label: "Immobilier", href: "/immobilier" },
  { label: "Cleaning", href: "/cleaning" },
  { label: "À propos", href: "/a-propos" },
  { label: "Contact", href: "/contact" },
];

export const footerNavGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Nos pôles",
    items: [
      { label: "KAS Immobilier", href: "/immobilier" },
      { label: "KAS Cleaning", href: "/cleaning" },
    ],
  },
  {
    title: "Keur Anta Services",
    items: [
      { label: "À propos", href: "/a-propos" },
      { label: "Contact", href: "/contact" },
      { label: "Connexion", href: "/connexion" },
    ],
  },
];

export type ContactLine = {
  label: string;
  href: string;
  display: string;
};

/**
 * Numéro WhatsApp du pôle immobilier, au format international SANS « + », ni
 * espaces, ni tirets — c'est le seul format qu'accepte `wa.me`.
 *
 * Le `phone.href` ci-dessus et cette constante portent le même numéro. Les
 * divergence ici se verrait sur le terrain : un lien vers un mauvais numéro
 * ouvre une conversation avec un tiers, sans le moindre avertissement.
 */
const WHATSAPP_IMMO = "221778919929";

/**
 * Contact du pôle immobilier : DEUX lignes.
 *
 * - `fixedLine` : le fixe de l'agence. Une seule action, Appeler. Il n'a pas
 *   de WhatsApp, et ne doit jamais en recevoir un.
 * - `mobile` : le mobile, qui porte en plus la conversation WhatsApp.
 *
 * `fixedLine.href` et `mobile.href` contiennent deux numéros distincts. Les
 * confondre fait appeler l'un en croyant joindre l'autre : d'où la
 * séparation explicite, plutôt qu'un tableau de numéros indistinguishable.
 */
export const immobilierContact: {
  name: string;
  shortName: string;
  /** Fixe de l'agence : appel uniquement. */
  fixedLine: ContactLine;
  /** Mobile de l'agence : appel et WhatsApp. */
  mobile: ContactLine;
  /** Lien vers la conversation WhatsApp, sans message prérempli. */
  whatsapp: ContactLine;
  /** Construit un lien WhatsApp, avec un message prérempli facultatif. */
  whatsappLink: (message?: string) => string;
  services: string[];
} = {
  name: "KAS Immobilier",
  shortName: "KASS IMMO",
  fixedLine: {
    label: "Téléphone fixe",
    href: "tel:+221338050580",
    display: "33 805 05 80",
  },
  mobile: {
    label: "Mobile / WhatsApp",
    href: "tel:+221778919929",
    display: "77 891 99 29",
  },
  whatsapp: {
    label: "WhatsApp",
    href: `https://wa.me/${WHATSAPP_IMMO}`,
    display: "77 891 99 29",
  },
  // `encodeURIComponent` est indispensable : un message accentué ou ponctué
  // contient des caractères que l'URL ne tolère pas tels quels, et WhatsApp
  // afficherait le texte brut — ou refuserait le lien.
  whatsappLink: (message?: string) =>
    message
      ? `https://wa.me/${WHATSAPP_IMMO}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${WHATSAPP_IMMO}`,
  services: ["Location", "Vente", "Achat", "Gestion locative"],
};

/** Contact du pôle cleaning (deux numéros). */
export const cleaningContact: {
  name: string;
  shortName: string;
  phones: ContactLine[];
  services: string[];
} = {
  name: "KAS Cleaning",
  shortName: "KAS CLEANING",
  phones: [
    {
      label: "Téléphone 1",
      href: "tel:+221784701616",
      display: "78 470 16 16",
    },
    {
      label: "Téléphone 2",
      href: "tel:+221338050580",
      display: "33 805 05 80",
    },
  ],
  services: ["Appartements", "Studios", "Maisons", "Bureaux"],
};

export const socialLinks: {
  label: string;
  handle: string;
  href: string;
}[] = [
  {
    label: "TikTok",
    handle: "@kasimmo6",
    href: "https://www.tiktok.com/@kasimmo6",
  },
];

/**
 * Logo KAS Immobilier — utilisé dans le header et le footer.
 * `darkSrc` est la variante générée par `scripts/generate-dark-logos.mjs`
 * (parties noires passées en blanc, bordeaux inchangé).
 */
export const immobilierLogo = {
  src: "/images/logo-kas-immobilier.webp",
  darkSrc: "/images/logo-kas-immobilier-dark.webp",
  width: 1138,
  height: 724,
  alt: "KAS Immobilier",
} as const;

/** Logo KAS Cleaning — réservé à la section / page Cleaning. */
export const cleaningLogo = {
  src: "/images/logo-kas-cleaning.webp",
  darkSrc: "/images/logo-kas-cleaning-dark.webp",
  width: 516,
  height: 424,
  alt: "KAS Cleaning — Keur Anta Services",
} as const;

export type BackgroundConfig = {
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Position CSS du sujet dans le cadre, pour les cadrages en portrait. */
  objectPosition: string;
  /** Teinte de fond servie pendant le chargement de la photo. */
  backgroundColor: string;
  /** Miniature de flou encodée en base64, pour éviter le flash blanc. */
  blurDataURL: string;
};

/**
 * Photos d'arrière-plan du hero et des bannières de pôle.
 * `blurDataURL` est un dégradé de 8 px dérivé de la photo moyenne,
 * assombri et teinté bordeaux (voir `scripts/generate-backgrounds.mjs`).
 */
export const backgrounds = {
  hero: {
    src: "/images/backgrounds/hero.webp",
    width: 1920,
    height: 1080,
    alt: "Maison individuelle aux couleurs chaudes, en fin de journée",
    objectPosition: "center",
    backgroundColor: "#240210",
    blurDataURL:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAANklEQVR42mMwVFTGihh05BSwIgYNaRmsiEFZQhIrYpAXFcOKGKSEhLEiBjF+fqyIQZCHBysCAB1fE8H9qTmTAAAAAElFTkSuQmCC",
  },
  immobilier: {
    src: "/images/backgrounds/immobilier.webp",
    width: 2528,
    height: 1686,
    alt: "Immeubles résidentiels alignés le long d'une rue de Dakar",
    objectPosition: "center 40%",
    backgroundColor: "#240210",
    blurDataURL:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAANklEQVR42mPQUdbCihg0FNSwIgYVWSWsiEFBSg4rYpAWk8aKGMSFxbEiBmEBYayIgZ+XHysCAHK/FIFTBtKEAAAAAElFTkSuQmCC",
  },
  cleaning: {
    src: "/images/backgrounds/cleaning.webp",
    width: 2338,
    height: 1508,
    alt: "Intérieur d'un appartement nettoyé, sol et mobilier en ordre",
    objectPosition: "center 45%",
    backgroundColor: "#240210",
    blurDataURL:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAANklEQVR42mMwU9PEihgMlVWxIgYdeSWsiEFdRg4rYlCWkMKKGORExbAiBklBYayIQYSPHysCAHBeFsH3aAToAAAAAElFTkSuQmCC",
  },
} as const satisfies Record<string, BackgroundConfig>;

/** Toutes les variantes de logo connues, indexées par chemin. */
export const logos = [immobilierLogo, cleaningLogo] as const;

export type LogoConfig = (typeof logos)[number];
