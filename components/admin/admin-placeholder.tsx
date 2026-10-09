import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";

/**
 * Cadre des pages d'administration encore à construire.
 *
 * La garde de rôle vient de `app/admin/layout.tsx` : ces pages ne sont
 * atteignables que par un administrateur, sans avoir à le répéter ici.
 */
export function AdminPlaceholder({
  titre,
  chemin,
  description,
  icone,
  texte,
}: {
  titre: string;
  chemin: string;
  description: string;
  icone: ReactNode;
  texte: string;
}) {
  return (
    <div>
      <AdminPageHeader
        titre={titre}
        sousTitre="Espace administrateur"
        chemin={chemin}
        description={description}
      />

      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-5 rounded-2xl border border-border bg-card px-6 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-text">
            {icone}
          </span>

          <h2 className="text-xl font-semibold text-foreground">
            Bientôt disponible
          </h2>
          <p className="text-sm text-muted-foreground">{texte}</p>

          <Button asChild variant="outline" className="mt-2">
            <Link href="/admin">
              <ArrowLeft aria-hidden="true" />
              Retour au tableau de bord
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
