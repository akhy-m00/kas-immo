import type { Metadata } from "next";
import Link from "next/link";

import { CleaningPhoneButton } from "@/components/CleaningPhoneButton";
import { Reveal } from "@/components/motion/Reveal";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import { SectionBadge } from "@/components/SectionBadge";
import { ImmoContactLines } from "@/components/ImmoContactLines";
import { Button } from "@/components/ui/button";
import {
  cleaningContact,
  immobilierContact,
  immobilierLogo,
  siteConfig,
  socialLinks,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez KAS Immobilier ou KAS Cleaning à Dakar.",
};

export default function ContactPage() {
  return (
    <div>
      <section className="border-b border-border bg-muted">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <SectionBadge
            logo={immobilierLogo}
            titre="Contact"
            sousTitre="Appelez-nous directement, du lundi au samedi"
            surface="carte"
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <StaggerGrid className="grid gap-5 lg:grid-cols-2">
<div className="rounded-2xl border border-border bg-card p-6 text-card-foreground sm:p-8">
              <p className="eyebrow">{immobilierContact.name}</p>
              <h2 className="mt-3 text-xl sm:text-2xl">Immobilier</h2>

              <ImmoContactLines className="mt-5" />

              <ul className="mt-6 flex flex-wrap gap-2">
              {immobilierContact.services.map((service) => (
                <li
                  key={service}
                  className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-text"
                >
                  {service}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground sm:p-8">
            <p className="eyebrow">{cleaningContact.name}</p>
            <h2 className="mt-3 text-xl sm:text-2xl">Nettoyage</h2>
            <CleaningPhoneButton
              size="lg"
              label="Appeler · 2 numéros"
              className="mt-5"
            />
            <ul className="mt-6 flex flex-wrap gap-2">
              {cleaningContact.services.map((service) => (
                <li
                  key={service}
                  className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-foreground"
                >
                  {service}
                </li>
              ))}
            </ul>
          </div>
        </StaggerGrid>

        <Reveal>
          <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-card-foreground sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="text-lg sm:text-xl">
                Vous préférez passer par le site ?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Un espace client est en préparation. Vous pouvez déjà vous y
                connecter, la gestion des comptes arrive bientôt.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="h-12 w-full shrink-0 sm:w-auto"
            >
              <Link href="/connexion">Se connecter</Link>
            </Button>
          </div>
        </Reveal>

        <Reveal>
          <p className="mt-8 text-sm text-muted-foreground">
            {siteConfig.legalName} · {siteConfig.city} —{" "}
            {socialLinks.map((social, index) => (
              <span key={social.label}>
                {index > 0 && " · "}
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="-mx-1 inline-flex min-h-11 items-center rounded px-1 font-semibold text-foreground hover:text-brand-text"
                >
                  {social.label}
                </a>
              </span>
            ))}
          </p>
        </Reveal>
      </section>
    </div>
  );
}
