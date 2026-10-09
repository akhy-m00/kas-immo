import { Suspense } from "react";
import type { Metadata } from "next";
import { Building2, SearchX } from "lucide-react";

import { BackgroundSection } from "@/components/BackgroundSection";
import { SectionBadge } from "@/components/SectionBadge";
import { CatalogueFiltres } from "@/components/immobilier/catalogue-filtres";
import { PropertyCard } from "@/components/immobilier/property-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  aDesFiltresActifs,
  listerBiensPublics,
  parseFiltres,
} from "@/lib/properties-public";
import { backgrounds, immobilierLogo } from "@/lib/site";

const photo = backgrounds.immobilier;

export const metadata: Metadata = {
  title: "KAS Immobilier",
  description: "Louer, vendre, acheter en toute confiance.",
};

/**
 * Le catalogue est rendu sur le serveur puis mis en cache, avec revalidation
 * à chaque écriture depuis l'espace admin (`revalidatePath`). Une page statique
 * qui ne verrait jamais les nouveaux biens serait inutile : c'est ce couplage
 * — ISR + revalidation explicite — qui donne un site rapide ET à jour.
 */
export const revalidate = 300;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ImmobilierPage({ searchParams }: PageProps) {
  const filtres = parseFiltres(await searchParams);
  const biens = await listerBiensPublics(filtres);
  const actifs = aDesFiltresActifs(filtres);

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
            logo={immobilierLogo}
            titre="KAS Immobilier"
            sousTitre="Louer, vendre, acheter en toute confiance"
            surface="carte"
          />
        </div>
      </BackgroundSection>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-xl sm:text-2xl">Nos biens disponibles</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Parcourez les logements et terrains que nous avons à Dakar. Chaque
            annonce indique le prix en francs CFA et la localisation.
          </p>
        </div>

        <div className="mt-8">
          {/* `useSearchParams` impose un rendu client : le reste de la page
              attend ce point pour ne pas désynchroniser filtres et résultats. */}
          <Suspense
            fallback={
              <div className="h-56 animate-pulse rounded-2xl border border-border bg-muted" />
            }
          >
            <CatalogueFiltres
              filtres={filtres}
              total={biens.length}
              actifs={actifs}
            />
          </Suspense>
        </div>

        <div className="mt-8">
          {biens.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {biens.map((bien, index) => (
                <PropertyCard
                  key={bien.id}
                  bien={bien}
                  prioritaire={index < 3}
                />
              ))}
            </ul>
          ) : (
            <CatalogueVide filtresActifs={actifs} />
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * Deux messages distincts : un catalogue vide n'est pas la même chose qu'une
 * recherche sans résultat. Dans le premier cas il n'y a rien à réinitialiser.
 */
function CatalogueVide({ filtresActifs }: { filtresActifs: boolean }) {
  if (!filtresActifs) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <Building2
          aria-hidden="true"
          className="size-8 text-muted-foreground"
        />
        <h3 className="font-semibold text-foreground">
          De nouveaux biens arrivent bientôt
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Notre catalogue est en cours de constitution. Revenez d&apos;ici peu,
          ou appelez-nous pour connaître nos disponibilités en avant-première.
        </p>
        <Button asChild variant="outline" className="mt-2">
          <Link href="/contact">Nous contacter</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <SearchX aria-hidden="true" className="size-8 text-muted-foreground" />
      <h3 className="font-semibold text-foreground">
        Aucun bien ne correspond à votre recherche
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Élargissez vos critères — location ou vente, type de bien, budget — pour
        voir plus de biens.
      </p>
      <Button asChild variant="outline" className="mt-2">
        <Link href="/immobilier">Voir tous les biens</Link>
      </Button>
    </div>
  );
}
