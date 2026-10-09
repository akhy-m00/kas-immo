"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ImagePlus, Loader2, TriangleAlert } from "lucide-react";

import {
  saveCleaningService,
  type CleaningFormState,
} from "@/app/admin/cleaning/actions";
import { AdminInput, AdminTextarea } from "@/components/admin/admin-field";
import { Button } from "@/components/ui/button";
import { CLEANING_DESCRIPTION_MAX, CLEANING_TITLE_MAX } from "@/lib/cleaning";
import type { CleaningService } from "@/lib/supabase/database.types";

/**
 * Formulaire de création et de modification d'un service de cleaning.
 *
 * Un seul composant pour les deux opérations : les deux pages ne font que
 * passer un service existant ou `null`, et le mode est déduit de la présence du
 * service. Le même principe est appliqué côté serveur, avec une action unique
 * (`saveCleaningService`) qui lit l'identifiant dans un champ caché.
 *
 * `useActionState` fournit les messages d'erreur renvoyés par l'action, ce qui
 * évite de gérer à la main le retour serveur après soumission.
 */
export function ServiceForm({ service }: { service: CleaningService | null }) {
  const [etat, action, enAttente] = useActionState<CleaningFormState, FormData>(
    saveCleaningService,
    null,
  );

  const [titre, setTitre] = useState(service?.title ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [apercu, setApercu] = useState<string | null>(
    service?.image_url ?? null,
  );

  // L'aperçu suit le fichier choisi localement, sans envoi : l'URL publique
  // n'existe qu'après l'enregistrement. L'ancienne photo reste affichée tant
  // qu'aucun nouveau fichier n'est choisi — c'est le service actuel qui est
  // présenté, pas un état provisoire.
  const apercuLocal = useRef<string | null>(null);

  // `URL.revokeObjectURL` sur le changement suivant et au démontage : sans
  // cela, chaque prévisualisation garderait son blob en mémoire.
  useEffect(() => {
    return () => {
      if (apercuLocal.current) URL.revokeObjectURL(apercuLocal.current);
    };
  }, []);

  function surChoixPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const fichier = event.target.files?.[0];
    if (!fichier) return;

    if (apercuLocal.current) URL.revokeObjectURL(apercuLocal.current);

    const url = URL.createObjectURL(fichier);
    apercuLocal.current = url;
    setApercu(url);
  }

  const enEdition = service !== null;
  const erreurGlobale = etat?.error ?? null;

  return (
    <form action={action} className="flex flex-col gap-8">
      {enEdition ? <input type="hidden" name="id" value={service.id} /> : null}

      {erreurGlobale ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive"
        >
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          {erreurGlobale}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <AdminInput
            id="titre"
            label="Titre"
            name="title"
            value={titre}
            onValueChange={setTitre}
            maxLength={CLEANING_TITLE_MAX}
            placeholder="Nettoyage complet d'appartement"
            required
            error={etat?.fieldErrors.title}
          />
          <p className="px-1 text-xs text-muted-foreground">
            Le nom de la prestation, tel qu&apos;il apparaîtra sur la carte.
          </p>
        </div>

        <AdminTextarea
          id="description"
          label="Description"
          name="description"
          value={description}
          onValueChange={setDescription}
          rows={6}
          maxLength={CLEANING_DESCRIPTION_MAX}
          placeholder="Ce que comprend la prestation, sa durée, les surfaces concernées…"
          hint="Présentez la prestation en quelques phrases : c'est ce texte qui donne envie de contacter."
          error={etat?.fieldErrors.description}
        />
      </div>

      <section aria-labelledby="photo-titre" className="flex flex-col gap-4">
        <div>
          <h2 id="photo-titre" className="text-sm font-medium text-foreground">
            Photo
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Une seule image, JPEG, PNG, WebP ou AVIF, 5 Mo maximum. Elle
            remplacera la photo actuelle si vous en choisissez une nouvelle.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative size-32 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
            {apercu ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={apercu}
                alt="Aperçu de la photo du service"
                className="size-full object-cover"
              />
            ) : (
              <span className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
                <ImagePlus aria-hidden="true" className="size-5" />
                <span className="text-[10px] leading-none">Aucune</span>
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="photo"
              className="text-sm font-medium text-foreground"
            >
              {enEdition ? "Remplacer la photo" : "Ajouter une photo"}
            </label>
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={surChoixPhoto}
              className="block w-full max-w-sm text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-brand-text file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-brand-surface hover:file:bg-brand-text-hover"
            />
            <p className="text-xs text-muted-foreground">
              La photo est facultative : sans image, une vignette de repli est
              affichée.
            </p>
          </div>
        </div>

        {etat?.fieldErrors.photo ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            {etat.fieldErrors.photo}
          </p>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <Button
          type="submit"
          size="lg"
          disabled={enAttente}
          aria-busy={enAttente}
        >
          {enAttente ? (
            <>
              <Loader2 aria-hidden="true" className="animate-spin" />
              Enregistrement…
            </>
          ) : enEdition ? (
            "Enregistrer les modifications"
          ) : (
            "Créer le service"
          )}
        </Button>

        <Button asChild variant="outline" size="lg">
          <Link href="/admin/cleaning">Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
