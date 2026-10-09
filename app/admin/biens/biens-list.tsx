"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageOff, Loader2, MapPin, Pencil, Trash2 } from "lucide-react";

import { deletePropertyAction } from "@/app/admin/biens/actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
  formatFcfa,
  type PropertyWithPhotos,
} from "@/lib/properties";
import { cn } from "@/lib/utils";

/**
 * Liste des biens, avec la suppression.
 *
 * La suppression est immédiate mais toujours confirmée : deux clics, dont le
 * second sur un bouton dont l'intitulé reprend le titre du bien. Le bouton
 * « Modifier » reste un simple lien, pour ne pas alourdir un clic qui ne
 * demande pas de confirmation.
 */
type BiensListProps = {
  biens: PropertyWithPhotos[];
  /** Nombre total avant filtrage, pour expliquer un résultat vide. */
  total: number;
};

export function BiensList({ biens, total }: BiensListProps) {
  if (biens.length === 0) {
    return <ListeVide total={total} />;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {biens.map((bien) => (
        <CarteBien key={bien.id} bien={bien} />
      ))}
    </ul>
  );
}

function CarteBien({ bien }: { bien: PropertyWithPhotos }) {
  const router = useRouter();
  const [confirme, setConfirme] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enAttente, demarrer] = useTransition();

  const principale = bien.photos[0];

  function supprimer() {
    setErreur(null);

    demarrer(async () => {
      const resultat = await deletePropertyAction(bien.id);

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
        {principale ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={principale.url}
              alt={`${bien.title} — photo principale`}
              className="size-full object-cover"
            />
            {bien.photos.length > 1 ? (
              <span className="absolute right-2 bottom-2 rounded-full bg-black/70 px-2 py-0.5 text-[0.65rem] font-semibold text-white">
                {bien.photos.length} photos
              </span>
            ) : null}
          </>
        ) : (
          <span className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff aria-hidden="true" className="size-6" />
            <span className="text-xs">Aucune photo</span>
          </span>
        )}

        <span className="absolute top-2 left-2">
          <StatusBadge
            status={bien.status}
            className="bg-background/90 backdrop-blur-sm"
          />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h2 className="font-semibold text-foreground">{bien.title}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin aria-hidden="true" className="size-3.5" />
            {bien.location}
          </p>
        </div>

        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <div className="flex gap-1">
            <dt>Type&nbsp;:</dt>
            <dd className="font-medium text-foreground">
              {PROPERTY_TYPE_LABELS[bien.type]}
            </dd>
          </div>
          <div className="flex gap-1">
            <dt>Transaction&nbsp;:</dt>
            <dd className="font-medium text-foreground">
              {TRANSACTION_TYPE_LABELS[bien.transaction_type]}
            </dd>
          </div>
        </dl>

        <p className="font-heading text-lg font-bold text-foreground">
          {formatFcfa(bien.price)}
        </p>

        {erreur ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            {erreur}
          </p>
        ) : null}

        {confirme ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm font-medium text-foreground">
              Supprimer « {bien.title} » définitivement&nbsp;? Ses photos seront
              effacées du stockage.
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
              <Link href={`/admin/biens/${bien.id}`}>
                <Pencil aria-hidden="true" />
                Modifier
              </Link>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirme(true)}
              disabled={enAttente}
              aria-label={`Supprimer ${bien.title}`}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

function ListeVide({ total }: { total: number }) {
  const filtres = total > 0;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-14 text-center",
      )}
    >
      <p className="font-semibold text-foreground">
        {filtres
          ? "Aucun bien ne correspond à ces filtres"
          : "Aucun bien publié"}
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {filtres
          ? "Modifiez ou réinitialisez les filtres pour revoir les autres biens."
          : "Commencez par créer votre première annonce."}
      </p>

      {filtres ? (
        <Button asChild variant="outline" size="sm" className="mt-2">
          <Link href="/admin/biens">Réinitialiser les filtres</Link>
        </Button>
      ) : (
        <Button asChild size="sm" className="mt-2">
          <Link href="/admin/biens/nouveau">Ajouter un bien</Link>
        </Button>
      )}
    </div>
  );
}
