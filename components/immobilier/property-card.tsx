import Image from "next/image";
import Link from "next/link";
import { ImageOff, MapPin } from "lucide-react";

import { StatusBadge } from "@/components/admin/status-badge";
import { AnimatedCard, PhotoZoom } from "@/components/motion/AnimatedCard";
import { Reveal } from "@/components/motion/Reveal";
import { formatFcfa, type PropertyWithPhotos } from "@/lib/properties";
import { resumeType } from "@/lib/properties-public";
import { cn } from "@/lib/utils";

/**
 * Carte d'un bien, utilisée par le catalogue et par la section « Biens à la
 * une » de l'accueil.
 *
 * Les animations au survol viennent des composants du site : `AnimatedCard`
 * soulève la carte de 6 px et `PhotoZoom` agrandit sa photo de 5 %. Aucun
 * effet n'est réécrit ici, pour que la sensation reste identique à celle des
 * cartes déjà présentes sur la page d'accueil.
 */

/**
 * `AnimatedCard` porte par défaut la variante `fadeUp`, qui attend d'un parent
 * animé pour passer de `hidden` à `visible`. Utilisée seule, sans ce parent,
 * la carte resterait à `opacity: 0`. On lui passe donc une variante neutre :
 * l'apparition est assurée par le `Reveal` qui l'enveloppe, et la carte ne peut
 * pas rester invisible.
 */
const VARIANTE_NEUTRE = { hidden: {}, visible: {} };

type PropertyCardProps = {
  bien: PropertyWithPhotos;
  /** `h3` dans le catalogue, `h2` sur l'accueil : le niveau dépend du contexte. */
  titre?: "h2" | "h3";
  /** Images eager pour la première carte, qui Above The Fold. */
  prioritaire?: boolean;
  className?: string;
};

export function PropertyCard({
  bien,
  titre = "h3",
  prioritaire = false,
  className,
}: PropertyCardProps) {
  const Titre = titre;
  const principale = bien.photos[0];

  return (
    <Reveal as="li" className={cn("h-full", className)}>
      <AnimatedCard
        as="article"
        variant={VARIANTE_NEUTRE}
        className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
      >
        <Link
          href={`/immobilier/${bien.id}`}
          className="flex h-full flex-col focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <div className="relative aspect-16/10 overflow-hidden bg-muted">
            {principale ? (
              <PhotoZoom>
                <Image
                  src={principale.url}
                  alt={`${bien.title} — photo principale`}
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

            {bien.photos.length > 1 ? (
              <span className="absolute right-2 bottom-2 rounded-full bg-black/70 px-2 py-0.5 text-[0.65rem] font-semibold text-white">
                {bien.photos.length} photos
              </span>
            ) : null}

            <span className="absolute top-2 left-2">
              <StatusBadge
                status={bien.status}
                className="bg-background/90 backdrop-blur-sm"
              />
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-3 p-4">
            <div>
              <Titre className="font-semibold text-card-foreground">
                {bien.title}
              </Titre>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">{bien.location}</span>
              </p>
            </div>

            <p className="text-xs text-muted-foreground">{resumeType(bien)}</p>

            <p className="mt-auto pt-1 text-lg font-bold text-foreground">
              {formatFcfa(bien.price)}
            </p>
          </div>
        </Link>
      </AnimatedCard>
    </Reveal>
  );
}
