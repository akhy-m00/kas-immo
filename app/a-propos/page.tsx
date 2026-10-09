import type { Metadata } from "next";

import { SectionBadge } from "@/components/SectionBadge";
import { immobilierLogo, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "Keur Anta Services (KAS) intervient à Dakar sur deux pôles : l’immobilier et le nettoyage professionnel.",
};

export default function AProposPage() {
  return (
    <div>
      <section className="border-b border-border bg-muted">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <SectionBadge
            logo={immobilierLogo}
            titre="À propos"
            sousTitre="Keur Anta Services, votre partenaire à Dakar"
            surface="carte"
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-xl sm:text-2xl">Qui sommes-nous</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {siteConfig.legalName} est une entreprise basée à {siteConfig.city}.
            Nous intervenons sur deux pôles complémentaires : l’immobilier et le
            nettoyage professionnel.
          </p>

          <h2 className="mt-10 text-xl sm:text-2xl">Nos deux pôles</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6">
              <h3 className="text-base font-bold sm:text-lg">KAS Immobilier</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Location, vente, achat et gestion locative, avec
                l’accompagnement des propriétaires et des locataires.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6">
              <h3 className="text-base font-bold sm:text-lg">KAS Cleaning</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Nettoyage professionnel d’appartements, studios, maisons et
                bureaux, avec produits et matériel fournis.
              </p>
            </div>
          </div>

          <h2 className="mt-10 text-xl sm:text-2xl">Nos engagements</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {[
              "Prix affichés en FCFA, sans surprise.",
              "Accompagnement et échanges en français.",
              "Réponse rapide au téléphone, sans formulaire à remplir.",
            ].map((engagement) => (
              <li
                key={engagement}
                className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground sm:text-base"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-text"
                />
                {engagement}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
