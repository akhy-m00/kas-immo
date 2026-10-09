import Image from "next/image";
import { ImageOff, Sparkles } from "lucide-react";

import { AnimatedCard, PhotoZoom } from "@/components/motion/AnimatedCard";
import { Reveal } from "@/components/motion/Reveal";
import { RequestQuoteDialog } from "@/components/cleaning/request-quote-dialog";
import type { CleaningService } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

/**
 * Carte d'une prestation de cleaning.
 *
 * Les animations au survol viennent des composants du site : `AnimatedCard`
 * soulève la carte de 6 px et `PhotoZoom` agrandit sa photo de 5 %. Aucun effet
 * n'est réécrit ici, pour que la sensation reste identique à celle des cartes
 * du catalogue immobilier.
 *
 * Le corps de la carte n'est toujours pas un lien : une prestation n'a pas de
 * page de détail, et un lien vers une page inexistante romprait la navigation au
 * clavier. En revanche la carte porte désormais l'action « Demander un devis »,
 * sous la forme d'un bouton explicite — un devis se demande pour UNE prestation,
 * et le clic doit donc viser le bouton, pas la photo ni le titre.
 */

/**
 * `AnimatedCard` porte par défaut la variante `fadeUp`, qui attend d'un parent
 * animé pour passer de `hidden` à `visible`. Utilisée seule, sans ce parent, la
 * carte resterait à `opacity: 0`. On lui passe donc une variante neutre :
 * l'apparition est assurée par le `Reveal` qui l'enveloppe, et la carte ne peut
 * pas rester invisible.
 */
const VARIANTE_NEUTRE = { hidden: {}, visible: {} };

type ServiceCardProps = {
  service: CleaningService;
  /** Images eager pour les premières cartes, qui sont Above The Fold. */
  prioritaire?: boolean;
  className?: string;
};

export function ServiceCard({
  service,
  prioritaire = false,
  className,
}: ServiceCardProps) {
  return (
    <Reveal as="li" className={cn("h-full", className)}>
      <AnimatedCard
        as="article"
        variant={VARIANTE_NEUTRE}
        className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
      >
        <div className="relative aspect-16/10 overflow-hidden bg-muted">
          {service.image_url ? (
            <PhotoZoom>
              <Image
                src={service.image_url}
                alt={`${service.title} — photo`}
                fill
                priority={prioritaire}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
              />
            </PhotoZoom>
          ) : (
            <span className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageOff aria-hidden="true" className="size-6" />
              <span className="text-xs">Aucune photo</span>
            </span>
          )}

          <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-[0.65rem] font-semibold text-brand-text backdrop-blur-sm">
            <Sparkles aria-hidden="true" className="size-3" />
            Prestation
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <h3 className="font-semibold text-card-foreground">
            {service.title}
          </h3>

          {service.description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {service.description}
            </p>
          ) : null}

          {/* Poussé en bas par `mt-auto` : le bouton s'aligne sur la même ligne
              d'un bout à l'autre de la grille, quelles que soient les longueurs
              de description. `size="lg"` garde une cible tactile confortable sur
              mobile. */}
          <RequestQuoteDialog
            cleaningServiceId={service.id}
            cleaningServiceTitle={service.title}
            className="mt-auto w-full"
          />
        </div>
      </AnimatedCard>
    </Reveal>
  );
}
