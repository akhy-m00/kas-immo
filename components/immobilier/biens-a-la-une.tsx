import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { PropertyCard } from "@/components/immobilier/property-card";
import { Button } from "@/components/ui/button";
import { listerBiensRecents } from "@/lib/properties-public";

/**
 * Section « Biens à la une » de la page d'accueil.
 *
 * Le composant rend `null` quand le catalogue est vide : la page d'accueil est
 * prérendue, et afficher un bloc « Aucun bien » sur une page dont la Selling
 * est l'immobilier affaiblirait le message bien plus qu'un espace manquant.
 *
 * En revanche, un seul bien disponible suffit à faire apparaître la section :
 * un bien publié doit être visible sur l'accueil, même si c'est le seul.
 */
export async function BiensALaUne() {
  const biens = await listerBiensRecents();

  if (biens.length === 0) return null;

  return (
    <section
      aria-labelledby="titre-biens-a-la-une"
      className="border-t border-border bg-muted/40"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 id="titre-biens-a-la-une" className="text-xl sm:text-2xl">
              Biens à la une
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Les dernières annonces disponibles, à Dakar et alentours.
            </p>
          </div>

          <Button asChild variant="outline" className="gap-2">
            <Link href="/immobilier">
              Voir tous les biens
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {biens.map((bien) => (
            <PropertyCard key={bien.id} bien={bien} titre="h3" />
          ))}
        </ul>
      </div>
    </section>
  );
}
