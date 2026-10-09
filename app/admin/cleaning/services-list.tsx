"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageOff, Loader2, Pencil, Trash2 } from "lucide-react";

import { deleteCleaningServiceAction } from "@/app/admin/cleaning/actions";
import { Button } from "@/components/ui/button";
import { resumeDescription } from "@/lib/cleaning";
import type { CleaningService } from "@/lib/supabase/database.types";

/**
 * Liste des prestations de cleaning, avec la suppression.
 *
 * Même interaction que la liste des biens : la suppression est confirmée par
 * deux clics, dont le second sur un bouton dont l'intitulé reprend le titre du
 * service. « Modifier » reste un simple lien, pour ne pas alourdir un clic qui
 * ne demande pas de confirmation.
 *
 * La photo est affichée avec `<img>` et non `next/image` : c'est une vignette
 * de grille, pas une illustration, et l'optimiseur serait ici un coût sans
 * contrepartie.
 */
export function ServicesList({ services }: { services: CleaningService[] }) {
  if (services.length === 0) {
    return <ListeVide />;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <CarteService key={service.id} service={service} />
      ))}
    </ul>
  );
}

function CarteService({ service }: { service: CleaningService }) {
  const router = useRouter();
  const [confirme, setConfirme] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enAttente, demarrer] = useTransition();

  function supprimer() {
    setErreur(null);

    demarrer(async () => {
      const resultat = await deleteCleaningServiceAction(service.id);

      if (!resultat.ok) {
        setErreur(resultat.error);
        return;
      }

      setConfirme(false);
      router.refresh();
    });
  }

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative aspect-16/10 bg-muted">
        {service.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={service.image_url}
            alt={`${service.title} — illustration`}
            className="size-full object-cover"
          />
        ) : (
          <span className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff aria-hidden="true" className="size-6" />
            <span className="text-xs">Aucune photo</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h2 className="font-semibold text-foreground">{service.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {resumeDescription(service.description)}
          </p>
        </div>

        {erreur ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            {erreur}
          </p>
        ) : null}

        {confirme ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm font-medium text-foreground">
              Supprimer « {service.title} » définitivement&nbsp;? Sa photo sera
              effacée du stockage.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cette action est irréversible.
            </p>

            <div className="mt-3 flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={supprimer}
                disabled={enAttente}
                aria-busy={enAttente}
              >
                {enAttente ? (
                  <>
                    <Loader2 aria-hidden="true" className="animate-spin" />
                    Suppression…
                  </>
                ) : (
                  <>
                    <Trash2 aria-hidden="true" />
                    Supprimer
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirme(false)}
                disabled={enAttente}
              >
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-auto flex gap-2 pt-1">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link href={`/admin/cleaning/${service.id}`}>
                <Pencil aria-hidden="true" />
                Modifier
              </Link>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirme(true)}
              disabled={enAttente}
              aria-label={`Supprimer ${service.title}`}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

function ListeVide() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
      <p className="font-semibold text-foreground">Aucun service publié</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Commencez par créer votre première prestation : elle apparaîtra
        immédiatement sur la page Cleaning du site.
      </p>

      <Button asChild size="sm" className="mt-2">
        <Link href="/admin/cleaning/nouveau">Ajouter un service</Link>
      </Button>
    </div>
  );
}
