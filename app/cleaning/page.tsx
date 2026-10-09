import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Sparkles } from "lucide-react";

import { BackgroundSection } from "@/components/BackgroundSection";
import { SectionBadge } from "@/components/SectionBadge";
import { CleaningRequestForm } from "@/components/cleaning/cleaning-request-form";
import { Button } from "@/components/ui/button";
import { backgrounds, cleaningContact, cleaningLogo } from "@/lib/site";

const photo = backgrounds.cleaning;

/** Le premier numéro est celui affiché en appel à l'action. */
const telephone = cleaningContact.phones[0];

export const metadata: Metadata = {
  title: "KAS Cleaning",
  description: "Un service de nettoyage efficace.",
};

/**
 * KAS Cleaning ne charge plus aucun catalogue.
 *
 * La page ne lit donc plus `cleaning_services` : le visiteur ne choisit plus une
 * prestation, il décrit le nettoyage dont il a besoin. Cette suppression est
 * aussi ce qui rend la page rapide — plus de requête Supabase, donc plus de
 * risque que le catalogue soit vide, périmé ou indisponible au premier rendu.
 *
 * Elle reste prérendue (`revalidate`) et ne lit aucune session : le nom et le
 * téléphone du demandeur sont repris dans le navigateur, par le formulaire,
 * comme cela se fait déjà pour la demande de visite d'un bien. Appeler
 * `cookies()` ici ferait basculer la route en rendu dynamique à chaque visite,
 * pour une page dont la seule donnée est un formulaire.
 */
export const revalidate = 300;

export default function CleaningPage() {
  return (
    <div>
      {/* Bannière — inchangée, c'est l'identité visuelle de la page */}
      <BackgroundSection
        image={photo.src}
        alt={photo.alt}
        overlay={0.3}
        objectPosition={photo.objectPosition}
        backgroundColor={photo.backgroundColor}
        blurDataURL={photo.blurDataURL}
        className="min-h-[50svh] border-b border-white/10 md:min-h-[50svh]"
        contentClassName="flex min-h-[50svh] items-center"
        parallax={56}
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <SectionBadge
            logo={cleaningLogo}
            titre="KAS Cleaning"
            sousTitre="Un service de nettoyage efficace"
            surface="carte"
          />
        </div>
      </BackgroundSection>

      <section className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-xl sm:text-2xl">Demander un rendez-vous</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Nettoyage d&apos;appartements, de studios, de maisons, d&apos;immeubles
            et de bureaux à Dakar, ainsi qu&apos;après un déménagement. Indiquez
            le type de nettoyage et le créneau qui vous convient&nbsp;: nous vous
            rappelons pour confirmer.
          </p>
        </div>

        {/* Le formulaire est le contenu de la page. Aucune étape intermédiaire :
            ni catalogue à parcourir, ni fiche à ouvrir, ni compte à créer. */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-7">
          <CleaningRequestForm />
        </div>

        {/* Le téléphone reste accessible pour qui préfère appeler, ou ne peut
            pas remplir un formulaire. Il est placé APRÈS le formulaire et non
            avant : c'est l'action principale, le téléphone n'est que l'alternative. */}
        <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-10 text-center">
          <span className="flex items-center gap-2 text-sm font-semibold text-brand-text">
            <Sparkles aria-hidden="true" className="size-4" />
            Vous préférez nous appeler&nbsp;?
          </span>

          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Notre équipe répond au téléphone pour organiser votre intervention.
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <a href={telephone.href}>
                <Phone aria-hidden="true" />
                {telephone.display}
              </a>
            </Button>

            <Button asChild variant="outline" size="lg">
              <Link href="/contact">Nous contacter</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}