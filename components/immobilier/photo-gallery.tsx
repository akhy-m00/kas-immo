"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, X, ZoomIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PropertyPhoto } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

/**
 * Galerie des photos d'un bien.
 *
 * Grille au repos, agrandissement au clic dans une visionneuse plein écran.
 * La visionneuse ferme par la touche Échap, se parcourt aux flèches et bloque
 * le défilement de la page tant qu'elle est ouverte.
 */

type PhotoGalleryProps = {
  photos: PropertyPhoto[];
  /** Nom du bien, pour l'image alternative et le titre de la visionneuse. */
  titre: string;
};

export function PhotoGallery({ photos, titre }: PhotoGalleryProps) {
  const [ouverte, setOuverte] = useState<number | null>(null);

  const fermer = useCallback(() => setOuverte(null), []);

  const suivant = useCallback(() => {
    setOuverte((index) =>
      index === null ? null : (index + 1) % photos.length,
    );
  }, [photos.length]);

  const precedent = useCallback(() => {
    setOuverte((index) =>
      index === null ? null : (index - 1 + photos.length) % photos.length,
    );
  }, [photos.length]);

  useEffect(() => {
    if (ouverte === null) return;

    function surTouche(event: KeyboardEvent) {
      if (event.key === "Escape") fermer();
      if (event.key === "ArrowRight") suivant();
      if (event.key === "ArrowLeft") precedent();
    }

    document.addEventListener("keydown", surTouche);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", surTouche);
      document.body.style.overflow = "";
    };
  }, [ouverte, fermer, suivant, precedent]);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-16/10 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted text-muted-foreground">
        <ImageOff aria-hidden="true" className="size-8" />
        <p className="text-sm">Aucune photo pour ce bien.</p>
      </div>
    );
  }

  return (
    <>
      {photos.length === 1 ? (
        <button
          type="button"
          onClick={() => setOuverte(0)}
          className="group relative block aspect-16/10 w-full overflow-hidden rounded-2xl border border-border bg-muted"
        >
          <Image
            src={photos[0].url}
            alt={`${titre} — photo 1`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <Agrandir />
        </button>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setOuverte(index)}
                className={cn(
                  "group relative block w-full overflow-hidden rounded-xl border border-border bg-muted",
                  // La première photo occupe deux colonnes : la grille garde une
                  // forme équilibrée sans rogner l'image principale.
                  index === 0 ? "col-span-2 aspect-16/10" : "aspect-square",
                )}
              >
                <Image
                  src={photo.url}
                  alt={`${titre} — photo ${index + 1}`}
                  fill
                  priority={index === 0}
                  sizes={
                    index === 0
                      ? "(max-width: 640px) 100vw, 40vw"
                      : "(max-width: 640px) 50vw, 20vw"
                  }
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {index === 0 && photos.length > 3 ? (
                  <span className="absolute right-3 bottom-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
                    +{photos.length - 1} photos
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {ouverte !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photos de ${titre}`}
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
        >
          <div className="flex items-center justify-between gap-4 p-4 text-white">
            <p className="text-sm font-medium">
              {ouverte + 1} / {photos.length}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={fermer}
              aria-label="Fermer la visionneuse"
              className="text-white hover:bg-white/15 hover:text-white"
            >
              <X />
            </Button>
          </div>

          <div className="relative flex-1">
            <Image
              src={photos[ouverte].url}
              alt={`${titre} — photo ${ouverte + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          {photos.length > 1 ? (
            <div className="flex items-center justify-between gap-4 p-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={precedent}
                aria-label="Photo précédente"
                className="border-white/40 bg-transparent text-white hover:bg-white/15 hover:text-white"
              >
                <ChevronLeft />
              </Button>
              <p className="sr-only">
                Utilisez les flèches gauche et droite pour naviguer, Échap pour
                fermer.
              </p>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={suivant}
                aria-label="Photo suivante"
                className="border-white/40 bg-transparent text-white hover:bg-white/15 hover:text-white"
              >
                <ChevronRight />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function Agrandir() {
  return (
    <span
      aria-hidden="true"
      className="absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full bg-black/70 text-white"
    >
      <ZoomIn className="size-4" />
    </span>
  );
}
