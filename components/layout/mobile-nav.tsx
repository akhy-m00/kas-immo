"use client";

import { useState } from "react";
import { ChevronDown, Phone } from "lucide-react";

import { AuthNavLink } from "@/components/auth/auth-nav-link";
import { NavLink } from "@/components/layout/nav-link";
import { BurgerIcon, MobileNavLinks } from "@/components/motion/mobile-motion";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cleaningContact, immobilierContact, mainNav } from "@/lib/site";

/**
 * Ligne de contact compacte : toute la surface est cliquable, la cible tactile
 * mesure 44 px de haut (`min-h-11`). Le clic ferme aussi le panneau, pour les
 * liens `tel:` qui ne déclenchent aucune navigation interne.
 */
function ContactLink({
  href,
  display,
  prefix,
  onSelect,
}: {
  href: string;
  display: string;
  prefix?: string;
  onSelect: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onSelect}
      className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-brand-soft hover:text-brand-text focus-visible:bg-brand-soft focus-visible:text-brand-text focus-visible:outline-none"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-text">
        <Phone className="size-3.5" />
      </span>
      <span className="truncate">
        {prefix ? `${prefix} · ${display}` : display}
      </span>
    </a>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const closeSheet = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon-lg"
          aria-label="Ouvrir le menu"
          aria-haspopup="true"
          className="size-11 border-border bg-background text-foreground hover:bg-muted"
        >
          <BurgerIcon open={open} />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[86vw] max-w-sm border-border bg-background p-0 sm:max-w-sm"
      >
        <SheetHeader className="border-b border-border px-4 py-3.5">
          <SheetTitle className="font-heading text-base font-bold text-foreground">
            Menu
          </SheetTitle>
          <SheetDescription className="sr-only">
            Navigation principale du site Keur Anta Services
          </SheetDescription>
        </SheetHeader>

        <MobileNavLinks>
          {/*
            Le `onNavigate` de `NavLink` est utilisé plutôt qu'un `SheetClose
            asChild` : `NavLink` ne transmet pas les props injectées par un
            parent `asChild`, donc le clic n'aurait jamais fermé le panneau.
            Le clic ferme le menu immédiatement, puis la navigation Next.js se
            poursuit normalement.
          */}
          {mainNav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              showIndicator={false}
              onNavigate={closeSheet}
              className="rounded-lg px-4 py-2.5 text-base hover:bg-brand-soft aria-[current=page]:bg-brand-soft"
            />
          ))}

          <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
            {/* Connecté : accès au compte et déconnexion ; sinon : /connexion.
                `width="block"` pour un rendu plein largeur, cohérent avec les
                autres éléments de la liste. */}
            <AuthNavLink width="block" />

            {/* Les numéros et informations secondaires sont regroupés dans une
                section repliable pour garder le panneau compact. `<details>`
                natif : accessible, sans JS, et fiable sur Safari iPhone. */}
            <details className="group rounded-xl border border-border">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 text-sm font-semibold text-foreground transition-colors hover:bg-brand-soft focus-visible:bg-brand-soft focus-visible:text-brand-text focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                  <Phone className="size-4 text-brand-text" />
                  Contact
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                />
              </summary>

              <div className="flex flex-col gap-1 px-2 pt-1 pb-2">
                <p className="eyebrow px-3 pt-1">KAS Immobilier</p>
                <ContactLink
                  href={immobilierContact.fixedLine.href}
                  display={immobilierContact.fixedLine.display}
                  prefix="Fixe"
                  onSelect={closeSheet}
                />
                <ContactLink
                  href={immobilierContact.mobile.href}
                  display={immobilierContact.mobile.display}
                  prefix="Mobile"
                  onSelect={closeSheet}
                />

                <p className="eyebrow px-3 pt-2">KAS Cleaning</p>
                {cleaningContact.phones.map((phone) => (
                  <ContactLink
                    key={phone.href}
                    href={phone.href}
                    display={phone.display}
                    onSelect={closeSheet}
                  />
                ))}
              </div>
            </details>
          </div>
        </MobileNavLinks>
      </SheetContent>
    </Sheet>
  );
}
