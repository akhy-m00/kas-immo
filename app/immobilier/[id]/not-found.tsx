import { Building2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Page « Bien introuvable ».
 *
 * Placée au niveau du segment `[id]` : elle ne s'affiche que pour une URL de
 * fiche, et pas pour le reste du site. `notFound()` étant appelé par la page
 * voisine, la réponse HTTP est bien un 404 — utile pour les moteurs de
 * recherche — tout en restant dans le design du site.
 */
export default function BienIntrouvable() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Building2 aria-hidden="true" className="size-7" />
      </span>

      <h1 className="mt-6 text-2xl font-bold text-foreground sm:text-3xl">
        Bien introuvable
      </h1>

      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
        Cette annonce n&apos;existe pas, ou elle n&apos;est plus publiée. Elle a
        peut-être été louée, vendue, ou retirée du catalogue.
      </p>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className="h-12">
          <Link href="/immobilier">Voir tous les biens</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12">
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
      </div>
    </div>
  );
}
