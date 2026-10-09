"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, ImagePlus, Loader2, Trash2, X } from "lucide-react";

import {
  deletePhotoAction,
  reorderPhotosAction,
} from "@/app/admin/biens/actions";
import {
  PHOTO_ACCEPT,
  PHOTO_MAX_BYTES,
  PHOTO_MAX_COUNT,
  describePhotoError,
} from "@/lib/properties";
import type { PropertyPhoto } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

/**
 * Gestion des photos d'un bien.
 *
 * Deux populations cohabitent dans une seule liste ordonnée :
 *   • les photos déjà enregistrées, identifiées par leur `id` ;
 *   • les fichiers choisis mais pas encore envoyés.
 *
 * Chaque élément porte le jeton qui le représente dans l'ordre d'affichage :
 * `photo:{id}` pour une photo en ligne, `file:{n}` pour le n-ième fichier du
 * lot. `n` est attribué au moment du choix et ne bouge plus jamais, même si la
 * vignette est ensuite déplacée : il désigne la position du fichier dans le
 * `FormData`, qui est celle du serveur au moment de l'envoi. Sans cette
 * distinction, glisser une nouvelle photo devant une photo existante
 * décalerait tous les jetons et les photos seraient enregistrées dans le désordre.
 *
 * Les vignettes utilisent un `<img>` et non `next/image` : les aperçus locaux
 * sont des URL d'objet (`blob:`) que l'optimiseur d'images ne sait pas traiter,
 * et la grille est faite de petites vignettes qui n'en ont pas besoin.
 */

/** Une photo enregistrée, que l'on peut supprimer ou déplacer. */
export type PhotoItem = { kind: "photo"; photo: PropertyPhoto };

/** Un fichier local, prévisualisé depuis son URL d'objet. */
export type NewPhotoItem = {
  kind: "file";
  key: string;
  file: File;
  preview: string;
  /** Rang du fichier dans le lot, fixé à la sélection. */
  fileIndex: number;
};

export type PhotoListItem = PhotoItem | NewPhotoItem;

/** Jeton d'un élément, transmis tel quel dans l'ordre demandé. */
export function photoToken(item: PhotoListItem): string {
  return item.kind === "photo"
    ? `photo:${item.photo.id}`
    : `file:${item.fileIndex}`;
}

type PhotoManagerProps = {
  /** `null` tant que le bien n'est pas encore créé : l'ordre n'est alors qu'un état local. */
  propertyId: string | null;
  items: PhotoListItem[];
  onItemsChange: (items: PhotoListItem[]) => void;
  disabled?: boolean;
};

export function PhotoManager({
  propertyId,
  items,
  onItemsChange,
  disabled = false,
}: PhotoManagerProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const compteur = useRef(0);

  const [erreur, setErreur] = useState<string | null>(null);
  const [survol, setSurvol] = useState(false);
  const [enAttente, setEnAttente] = useState(false);
  const [glisse, setGlisse] = useState<number | null>(null);
  const [cible, setCible] = useState<number | null>(null);

  const dejaEnLigne = items.filter(isSaved).length;
  const aEnvoyer = items.filter(isNew).length;
  const restantes = PHOTO_MAX_COUNT - dejaEnLigne - aEnvoyer;

  function ajouter(selection: FileList | File[]) {
    setErreur(null);

    const acceptes: File[] = [];

    for (const file of Array.from(selection)) {
      if (restantes - acceptes.length <= 0) {
        setErreur(
          `Un bien ne peut pas avoir plus de ${PHOTO_MAX_COUNT} photos.`,
        );
        break;
      }

      const problem = describePhotoError(file);
      if (problem) {
        setErreur(problem);
        continue;
      }

      acceptes.push(file);
    }

    if (acceptes.length === 0) return;

    const nouveaux: NewPhotoItem[] = acceptes.map((file) => ({
      kind: "file",
      key: `${file.name}-${file.size}-${file.lastModified}-${++compteur.current}`,
      file,
      preview: URL.createObjectURL(file),
      fileIndex: compteur.current - 1,
    }));

    onItemsChange([...items, ...nouveaux]);
  }

  function retirer(key: string) {
    const item = items.find(
      (entry) => entry.kind === "file" && entry.key === key,
    );
    if (item?.kind === "file") URL.revokeObjectURL(item.preview);

    onItemsChange(
      items.filter((entry) => !(entry.kind === "file" && entry.key === key)),
    );
  }

  /** Déplace une photo et retourne la nouvelle liste, ou null si rien ne bouge. */
  function deplacer(depuis: number, vers: number): PhotoListItem[] | null {
    if (depuis === vers || depuis < 0 || vers < 0) return null;

    const suivant = [...items];
    const [deplace] = suivant.splice(depuis, 1);
    suivant.splice(vers, 0, deplace);

    onItemsChange(suivant);
    return suivant;
  }

  /**
   * Enregistre en base l'ordre des photos déjà en ligne.
   *
   * `liste` reçoit l'ordre À ENREGISTRER, et non l'ordre affiché : juste après
   * un glisser-déposer, `onItemsChange` n'a pas encore été pris en compte par
   * React. Lire `items` ici renverrait l'ordre d'avant le déplacement, et
   * l'enregistrement écraserait silencieusement le choix de l'administrateur
   * par l'ancien ordre.
   */
  async function enregistrerOrdre(liste: PhotoListItem[]) {
    if (!propertyId) return;

    setEnAttente(true);
    setErreur(null);

    const ids = liste.filter(isSaved).map((item) => item.photo.id);
    const resultat = await reorderPhotosAction(propertyId, ids);

    setEnAttente(false);

    if (!resultat.ok) {
      setErreur(resultat.error);
      router.refresh();
    }
  }

  async function supprimerPhoto(photo: PropertyPhoto) {
    setEnAttente(true);
    setErreur(null);

    const resultat = await deletePhotoAction(photo.id);

    setEnAttente(false);

    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }

    // `router.refresh()` re-rend le serveur, mais ne réinitialise pas l'état
    // d'un composant client déjà monté : sans cette mise à jour locale, la
    // photo supprimée resterait affichée jusqu'au rechargement complet, et
    // pourrait être renvoyée dans l'ordre au prochain enregistrement.
    onItemsChange(
      items.filter(
        (item) => !(item.kind === "photo" && item.photo.id === photo.id),
      ),
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(event) => {
          // `preventDefault` est indispensable : sans lui, le navigateur ouvre
          // le fichier déposé au lieu de laisser styler la zone.
          event.preventDefault();
          if (!disabled) setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(event) => {
          event.preventDefault();
          setSurvol(false);
          if (disabled || !event.dataTransfer.files.length) return;
          ajouter(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-2xl border-2 border-dashed transition-colors duration-200",
          survol && !disabled
            ? "border-brand-text bg-brand-text/5"
            : "border-border bg-muted/40",
          disabled && "opacity-60",
        )}
      >
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <ImagePlus
            aria-hidden="true"
            className="size-8 text-muted-foreground"
          />

          <div>
            <p className="text-sm font-semibold text-foreground">
              {restantes > 0
                ? "Glissez vos photos ici"
                : `Limite de ${PHOTO_MAX_COUNT} photos atteinte`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              JPEG, PNG, WebP ou AVIF — {PHOTO_MAX_BYTES / (1024 * 1024)} Mo par
              photo. La première photo sert de photo principale.
            </p>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || restantes <= 0}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          >
            Choisir des fichiers
          </button>

          <input
            ref={inputRef}
            type="file"
            accept={PHOTO_ACCEPT}
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) ajouter(event.target.files);
              // Vide le champ pour pouvoir re-sélectionner le même fichier
              // juste après l'avoir retiré de la liste.
              event.target.value = "";
            }}
          />
        </div>
      </div>

      {erreur ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {erreur}
        </p>
      ) : null}

      {items.length > 0 ? (
        <>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            {enAttente ? (
              <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            ) : (
              <GripVertical aria-hidden="true" className="size-3.5" />
            )}
            Glissez les vignettes pour changer l&apos;ordre. La première est la
            photo principale.
          </p>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item, index) => (
              <li
                key={item.kind === "photo" ? item.photo.id : item.key}
                draggable={!disabled && !enAttente}
                onDragStart={() => setGlisse(index)}
                onDragEnd={() => {
                  setGlisse(null);
                  setCible(null);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setCible(index);
                }}
                onDrop={(event) => {
                  event.preventDefault();

                  if (glisse !== null) {
                    const tousEnLigne = items.every(isSaved);
                    const suivant = deplacer(glisse, index);

                    // L'ordre n'est écrit en base que si toutes les photos sont
                    // déjà enregistrées. Sinon il n'est qu'un état local, et la
                    // soumission du formulaire l'appliquera en même temps que
                    // l'envoi des nouveaux fichiers.
                    if (propertyId && tousEnLigne && suivant) {
                      void enregistrerOrdre(suivant);
                    }
                  }

                  setGlisse(null);
                  setCible(null);
                }}
                className={cn(
                  "group relative aspect-4/3 cursor-grab overflow-hidden rounded-xl border border-border bg-muted active:cursor-grabbing",
                  glisse === index && "opacity-40",
                  cible === index &&
                    glisse !== index &&
                    "ring-2 ring-brand-text",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.kind === "photo" ? item.photo.url : item.preview}
                  alt={
                    item.kind === "photo"
                      ? `Photo ${index + 1} du bien`
                      : `Aperçu de ${item.file.name}`
                  }
                  className="size-full object-cover"
                />

                {index === 0 ? (
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[0.65rem] font-semibold text-white">
                    Principale
                  </span>
                ) : null}

                {item.kind === "file" ? (
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[0.65rem] font-semibold text-white">
                    À envoyer
                  </span>
                ) : null}

                {item.kind === "file" ? (
                  <button
                    type="button"
                    onClick={() => retirer(item.key)}
                    disabled={disabled}
                    aria-label={`Retirer ${item.file.name} de la sélection`}
                    className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-black/70 text-white transition-colors hover:bg-destructive disabled:opacity-50"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => supprimerPhoto(item.photo)}
                    disabled={disabled || enAttente}
                    aria-label={`Supprimer définitivement la photo ${index + 1}`}
                    className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-black/70 text-white transition-colors hover:bg-destructive disabled:opacity-50"
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function isNew(item: PhotoListItem): item is NewPhotoItem {
  return item.kind === "file";
}

function isSaved(item: PhotoListItem): item is PhotoItem {
  return item.kind === "photo";
}
