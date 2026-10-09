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
          <p className="text-sm text-muted-foreground">
            © {year} {siteConfig.legalName}. Tous droits réservés.
          </p>

          <ul className="flex flex-wrap items-center gap-4">
            {socialLinks.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="-mx-2 flex min-h-11 items-center rounded-lg px-2 font-heading text-sm font-semibold text-foreground hover:text-brand-text"
                >
                  {social.label}{" "}
                  <span className="text-muted-foreground">
                    @{social.handle.replace("@", "")}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
