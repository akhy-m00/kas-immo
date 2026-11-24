import Link from "next/link";
import { CleaningPhoneButton } from "@/components/CleaningPhoneButton";
import { ThemedLogo } from "@/components/ThemedLogo";
import { Separator } from "@/components/ui/separator";
import {
  footerNavGroups,
  immobilierLogo,
  siteConfig,
  socialLinks,
} from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-border bg-muted">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Marque */}
          <div className="sm:col-span-2 lg:col-span-1">
            <ThemedLogo
              logo={immobilierLogo}
              className="h-14 w-auto object-contain"
            />
            <p className="mt-4 text-sm text-muted-foreground">
              {siteConfig.legalName} · {siteConfig.city}
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Location, vente, achat et gestion locative, ainsi que le nettoyage
              professionnel d’appartements, studios, maisons et bureaux.
            </p>
          </div>

          {/* Contacts : KAS Cleaning seulement.
              Les deux numéros de KAS Immo ne sont PAS répétés ici. Le
              footer est identique sur toutes les pages, donc y remettre
              fixe + mobile + WhatsApp dupliquait trois fois sur l'accueil
              et sur chaque fiche bien, à quelques lignes d'un bouton flottant
              déjà permanent. La page Contact en fait le lieu unique, et le
              footer ne garde que le pôle cleaning, dont les numéros ne sont
              affichés nulle part ailleurs. */}
          <div className="flex flex-col gap-8">
            <div>
              <p className="eyebrow">KAS Cleaning</p>
              <CleaningPhoneButton
                size="lg"
                label="Appeler · 2 numéros"
                className="mt-3"
              />
            </div>
          </div>

          {/* Liens rapides */}
          {footerNavGroups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <p className="eyebrow">{group.title}</p>
              <ul className="mt-3 flex flex-col gap-1 sm:mt-4">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="-mx-2 flex min-h-11 items-center rounded-lg px-2 text-sm text-foreground transition-colors hover:text-brand-text"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <Separator className="my-10 bg-border" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1 text-center sm:text-left">
            <p className="text-sm text-muted-foreground">
              © {year} {siteConfig.legalName}. Tous droits réservés.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Conçu et développé par El Hadji Mor Ndiaye
            </p>
          </div>

          <ul className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
            {socialLinks.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${social.label} (${social.handle})`}
                  className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-text/50 hover:bg-brand-soft hover:text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text/50"
                >
                  {social.id === "tiktok" ? (
                    <TikTokIcon className="size-4.5" />
                  ) : (
                    <InstagramIcon className="size-4.5" />
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.068-.087a2.896 2.896 0 0 1 2.373-4.549c.264 0 .52.036.764.103V9.32a6.34 6.34 0 0 0-.764-.047C6.012 9.273 3.2 12.085 3.2 15.547c0 3.461 2.812 6.273 6.274 6.273 3.461 0 6.273-2.812 6.273-6.273V8.835a8.163 8.163 0 0 0 3.842 1.353V6.758a4.832 4.832 0 0 1-.001-.072z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}
