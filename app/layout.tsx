import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import { BackToTop } from "@/components/motion/BackToTop";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { WelcomeSplash } from "@/components/motion/WelcomeSplash";
import { SmoothScroll } from "@/components/SmoothScroll";
import { JsonLd } from "@/components/seo/json-ld";
import { TITRE_SITE, jsonLdSite } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

import "./globals.css";

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const displayFont = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700", "800"],
});

/**
 * Métadonnées par défaut de tout le site.
 *
 * Pas d'URL canonique ici : elle serait héritée par toute page qui n'en
 * déclare pas, et désignerait l'accueil comme version officielle de chaque
 * page. Chaque page publique déclare la sienne via `metadataPage()`.
 *
 * L'image de partage vient de `app/opengraph-image.tsx` (fichier), héritée par
 * les pages qui n'ont pas la leur.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: TITRE_SITE,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: "real estate",
  formatDetection: { telephone: false, email: false, address: false },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    locale: "fr_SN",
    type: "website",
    siteName: siteConfig.name,
    title: TITRE_SITE,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: TITRE_SITE,
    description: siteConfig.description,
  },
  // Code fourni par Google Search Console (« Balise HTML »), facultatif.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <JsonLd donnees={jsonLdSite()} />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <a href="#contenu" className="skip-link">
            Aller au contenu principal
          </a>
          <SmoothScroll />
          <ScrollProgress />
          <SiteHeader />
          <main id="contenu" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          {/* Un seul bouton flottant pour tout le site. Il se filtre lui-même
              sur `/admin` — voir `FloatingWhatsApp`. */}
          <FloatingWhatsApp />
          <BackToTop />
          <WelcomeSplash />
        </ThemeProvider>
      </body>
    </html>
  );
}
