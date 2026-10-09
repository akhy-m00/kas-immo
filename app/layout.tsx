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

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — Immobilier & Nettoyage à Dakar`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    locale: "fr_SN",
    type: "website",
    siteName: siteConfig.name,
    title: `${siteConfig.name} — Immobilier & Nettoyage à Dakar`,
    description: siteConfig.description,
  },
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
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
