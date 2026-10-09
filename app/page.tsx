import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BackgroundSection } from "@/components/BackgroundSection";
import { BiensALaUne } from "@/components/immobilier/biens-a-la-une";
import { KeyFigures } from "@/components/KeyFigures";
import { AnimatedCard } from "@/components/motion/AnimatedCard";
import { HeroSequence } from "@/components/motion/StaggeredText";
import { HeroTitle } from "@/components/motion/HeroTitle";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import { ThemedLogo } from "@/components/ThemedLogo";
import { Button } from "@/components/ui/button";
import {
  backgrounds,
  cleaningContact,
  cleaningLogo,
  immobilierContact,
  immobilierLogo,
  siteConfig,
} from "@/lib/site";

const hero = backgrounds.hero;

/**
 * La page reste prérendue comme avant : la section « Biens à la une » lit le
 * catalogue avec un client sans session, et la page est invalidée par
 * `revalidatePath("/")` à chaque publication côté admin.
 */
export const revalidate = 300;

export default async function HomePage() {
  return (
    <div>
      {/* Hero — photo plein écran, contenu centré verticalement */}
      <BackgroundSection
        image={hero.src}
        alt={hero.alt}
        priority
        overlay={0.55}
        objectPosition={hero.objectPosition}
        backgroundColor={hero.backgroundColor}
        blurDataURL={hero.blurDataURL}
        className="min-h-[85svh] border-b border-white/10 md:min-h-[90svh]"
        contentClassName="flex min-h-[85svh] items-center md:min-h-[90svh]"
        parallax={64}
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <HeroSequence
            eyebrow={
              <p className="eyebrow text-brand-300">{siteConfig.city}</p>
            }
            title={
              <HeroTitle
                className="mt-4 max-w-4xl text-[clamp(1.75rem,5.2vw,3.5rem)] leading-[1.08] text-white"
                line1="Keur Anta Services,"
                line2={[
                  { text: "votre" },
                  { text: "partenaire" },
                  { text: "immobilier", highlight: true },
                  { text: "et" },
                  { text: "nettoyage", highlight: true },
                ]}
                tail="à Dakar"
              />
            }
            description={
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
                Deux pôles, une même exigence : trouver votre bien, et garder
                votre espace impeccable. Prix en FCFA, accompagnement en
                français, réponse rapide au téléphone.
              </p>
            }
            actions={
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  asChild
                  size="lg"
                  className="h-13 w-full px-6 text-base sm:w-auto"
                >
                  <Link href="/immobilier">
                    Voir les biens
                    <ArrowRight />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-13 w-full border-white/70 bg-white/10 px-6 text-base text-white backdrop-blur-sm hover:bg-white/20 hover:text-white sm:w-auto"
                >
                  <Link href="/cleaning">Découvrir KAS Cleaning</Link>
                </Button>
              </div>
            }
            phone={
              // Sur la bannière, les deux numéros sont annoncés côte à côte et
              // cliquables, mais SANS boutons : un fond sombre supporte mal des
              // boutons remplis, et l'en-tête est déjà dense. Les actions
              // complètes vivent sur la page Contact et les fiches biens.
              <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/80">
                <span className="inline-flex flex-wrap items-center gap-x-2">
                  <span>Fixe :</span>
                  <a
                    href={immobilierContact.fixedLine.href}
                    className="-mx-1 inline-flex min-h-11 items-center rounded px-1 font-semibold text-white underline decoration-brand-300/70 underline-offset-4 hover:text-brand-300"
                  >
                    {immobilierContact.fixedLine.display}
                  </a>
                </span>

                <span className="inline-flex flex-wrap items-center gap-x-2">
                  <span>Mobile :</span>
                  <a
                    href={immobilierContact.mobile.href}
                    className="-mx-1 inline-flex min-h-11 items-center rounded px-1 font-semibold text-white underline decoration-brand-300/70 underline-offset-4 hover:text-brand-300"
                  >
                    {immobilierContact.mobile.display}
                  </a>
                </span>
              </p>
            }
          />
        </div>
      </BackgroundSection>

      {/* Aperçu des deux pôles — sert à valider le design system */}
      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <StaggerGrid className="grid items-stretch gap-5 sm:grid-cols-2 lg:gap-6">
          <AnimatedCard className="rounded-2xl" as="div">
            <BackgroundSection
              image={backgrounds.immobilier.src}
              alt={backgrounds.immobilier.alt}
              overlay={0.6}
              objectPosition={backgrounds.immobilier.objectPosition}
              backgroundColor={backgrounds.immobilier.backgroundColor}
              blurDataURL={backgrounds.immobilier.blurDataURL}
              className="h-full min-h-[26rem] rounded-2xl border border-white/15 shadow-soft transition-shadow sm:min-h-0"
              contentClassName="flex h-full"
              parallax={40}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 590px"
            >
              <div className="flex h-full w-full flex-col p-6 sm:p-8">
                <ThemedLogo
                  logo={immobilierLogo}
                  className="h-14 w-auto max-w-[70%] object-contain sm:h-16 lg:h-20"
                />
                <h2 className="mt-5 text-xl text-white sm:text-2xl">
                  {immobilierContact.name}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/85">
                  Location, vente, achat et gestion locative, avec
                  l’accompagnement des propriétaires et des locataires à Dakar.
                </p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {immobilierContact.services.map((service) => (
                    <li
                      key={service}
                      className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm"
                    >
                      {service}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  variant="link"
                  className="mt-6 h-11 w-fit p-0 text-brand-300 hover:text-brand-300"
                >
                  <Link href="/immobilier">
                    En savoir plus
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </BackgroundSection>
          </AnimatedCard>

          <AnimatedCard className="rounded-2xl" as="div">
            <BackgroundSection
              image={backgrounds.cleaning.src}
              alt={backgrounds.cleaning.alt}
              overlay={0.6}
              objectPosition={backgrounds.cleaning.objectPosition}
              backgroundColor={backgrounds.cleaning.backgroundColor}
              blurDataURL={backgrounds.cleaning.blurDataURL}
              className="h-full min-h-[26rem] rounded-2xl border border-white/15 shadow-soft transition-shadow sm:min-h-0"
              contentClassName="flex h-full"
              parallax={40}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 590px"
            >
              <div className="flex h-full w-full flex-col p-6 sm:p-8">
                <ThemedLogo
                  logo={cleaningLogo}
                  className="h-14 w-auto max-w-[70%] object-contain sm:h-16 lg:h-20"
                />
                <h2 className="mt-5 text-xl text-white sm:text-2xl">
                  {cleaningContact.name}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/85">
                  Nettoyage professionnel d’appartements, studios, maisons et
                  bureaux. Fin de chantier soignée, produits et matériel
                  fournis.
                </p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {cleaningContact.services.map((service) => (
                    <li
                      key={service}
                      className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm"
                    >
                      {service}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  variant="link"
                  className="mt-6 h-11 w-fit p-0 text-brand-300 hover:text-brand-300"
                >
                  <Link href="/cleaning">
                    En savoir plus
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </BackgroundSection>
          </AnimatedCard>
        </StaggerGrid>
      </section>

      <BiensALaUne />

      <KeyFigures />
    </div>
  );
}
