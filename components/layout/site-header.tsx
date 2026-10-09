import Link from "next/link";

import { CleaningPhoneButton } from "@/components/CleaningPhoneButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ThemedLogo } from "@/components/ThemedLogo";
import { AuthNavLink } from "@/components/auth/auth-nav-link";
import { AnimatedSiteHeader } from "@/components/layout/animated-site-header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavLink } from "@/components/layout/nav-link";
import { immobilierLogo, mainNav } from "@/lib/site";

export function SiteHeader() {
  return (
    <AnimatedSiteHeader>
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-4 sm:h-18 sm:gap-3 sm:px-6 lg:h-20 lg:px-8">
        <Link
          href="/"
          aria-label="KAS Immobilier — retour à l’accueil"
          className="-my-2 flex min-h-11 shrink-0 items-center py-2"
        >
          <ThemedLogo
            logo={immobilierLogo}
            // Le logo du header est au-dessus de la ligne de flottaison sur
            // toutes les tailles : sans `priority`, le navigateur ignore
            // `sizes` et le charge à la largeur de l'appareil (384 px sur
            // mobile) au lieu des 96 px réels.
            priority
            className="h-10 w-auto object-contain sm:h-12 lg:h-14"
          />
        </Link>

        <nav
          aria-label="Navigation principale"
          className="ml-auto hidden items-center gap-7 lg:flex"
        >
          {mainNav.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {/* Toujours visible, y compris sur mobile : juste avant le menu
              hamburger, donc atteignable sans ouvrir le panneau. */}
          <ThemeToggle />

          <CleaningPhoneButton
            placement="dropdown"
            label="Cleaning"
            className="hidden sm:block"
          />

          {/* Connecté : menu utilisateur ; sinon : lien vers /connexion.
              Le composant réserve la place du bouton dans les deux cas. */}
          <AuthNavLink className="hidden lg:block" />

          <div className="lg:hidden">
            <MobileNav />
          </div>
        </div>
      </div>
    </AnimatedSiteHeader>
  );
}
