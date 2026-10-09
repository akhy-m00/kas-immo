"use client";

import { CountUp } from "@/components/motion/CountUp";
import { Reveal } from "@/components/motion/Reveal";
import { StaggerGrid } from "@/components/motion/StaggerGrid";

/**
 * Bandeau de trois chiffres.
 *
 * Données provisoires : elles remplacent les compteurs définitifs dès que les
 * chiffres réels sont connus. La section est marquée comme telle dans le
 * contenu, pas seulement dans le code.
 */
const FIGURES = [
  { value: 100, prefix: "+", label: "biens accompagnés" },
  { value: 500, prefix: "+", label: "clients servis" },
  { value: 2, prefix: "", label: "pôles d'expertise" },
] as const;

export function KeyFigures() {
  return (
    <section
      aria-label="KAS en chiffres"
      className="border-y border-border bg-muted"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <Reveal>
          <p className="eyebrow">KAS en chiffres</p>
        </Reveal>

        <StaggerGrid
          className="mt-8 grid gap-6 sm:grid-cols-3 sm:gap-8"
          margin="-80px"
        >
          {FIGURES.map((figure) => (
            <div
              key={figure.label}
              className="rounded-2xl border border-border bg-card p-6 text-center"
            >
              <p className="font-heading text-4xl font-extrabold text-brand-text sm:text-5xl">
                <CountUp value={figure.value} prefix={figure.prefix} />
              </p>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                {figure.label}
              </p>
            </div>
          ))}
        </StaggerGrid>

        <Reveal>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Chiffres provisoires, à mettre à jour.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
