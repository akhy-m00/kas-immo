"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, Save } from "lucide-react";

import { saveProperty } from "@/app/admin/biens/actions";
import {
  AdminInput,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/admin-field";
import {
  PhotoManager,
  photoToken,
  type PhotoListItem,
  type PhotoItem,
} from "@/components/admin/photo-manager";
import { Button } from "@/components/ui/button";
import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
  type PropertyWithPhotos,
} from "@/lib/properties";
import type {
  PropertyStatus,
  PropertyType,
  TransactionType,
} from "@/lib/supabase/database.types";
import type { FieldErrors } from "@/lib/properties-admin";

/**
 * Formulaire de création et de modification d'un bien.
 *
 * Le même composant sert les deux pages : `/admin/biens/nouveau` lui passe
 * `null`, `/admin/biens/[id]` lui passe le bien. L'identifiant voyage dans un
 * champ caché, et une seule Server Action traite les deux cas.
 *
 * Les photos ne sont pas gérées par le champ `<input type="file">` du
 * navigateur : celui-ci ne conserve que la dernière sélection, alors que
 * l'administrateur peut choisir ses images en plusieurs fois. Le `FormData`
 * est donc reconstruit à la soumission à partir de la liste affichée, dans
 * l'ordre du glisser-déposer.
 */
type PropertyFormProps = {
  bien: PropertyWithPhotos | null;
};

type FormState = {
  title: string;
  description: string;
  type: PropertyType;
  transaction: TransactionType;
  price: string;
  location: string;
  status: PropertyStatus;
};

function initialState(bien: PropertyWithPhotos | null): FormState {
  return {
    title: bien?.title ?? "",
    description: bien?.description ?? "",
    type: bien?.type ?? "appartement",
    transaction: bien?.transaction_type ?? "location",
    // Le prix est un entier : il est renvoyé à l'écran sans séparateur, la
    // saisie reste un nombre et c'est le serveur qui reformate en FCFA.
    price: bien ? String(bien.price) : "",
    location: bien?.location ?? "",
    status: bien?.status ?? "disponible",
  };
}

export function PropertyForm({ bien }: PropertyFormProps) {
  const [champs, setChamps] = useState<FormState>(() => initialState(bien));
  const [items, setItems] = useState<PhotoListItem[]>(() =>
    (bien?.photos ?? []).map((photo): PhotoItem => ({ kind: "photo", photo })),
  );
  const [erreurGlobale, setErreurGlobale] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<FieldErrors>({});
  const [envoi, demarrerEnvoi] = useTransition();

  function majCle(champ: keyof FormState) {
    return (valeur: string) => {
      setChamps((actuel) => ({ ...actuel, [champ]: valeur }));
      // L'erreur du champ disparaît dès la première correction : la laisser
      // affiché pendant que l'on corrige est trompeur.
      setErreurs((actuel) => {
        if (!(champ in actuel)) return actuel;
        const suivant = { ...actuel };
        delete suivant[champ];
        return suivant;
      });
    };
  }

  async function soumettre(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();

    const donnees = new FormData(evenement.currentTarget);

    // Les fichiers sont reconstruits depuis la liste affichée, triés par leur
    // rang d'origine : c'est cet ordre que le serveur retrouve en lisant les
    // entrées `photos` du FormData.
    const aEnvoyer = items.filter((item) => item.kind === "file");
    const parRang = [...aEnvoyer].sort((a, b) => a.fileIndex - b.fileIndex);

    for (const item of parRang) {
      donnees.append("photos", item.file, item.file.name);
    }

    // Le jeton d'un nouveau fichier doit être sa position dans `parRang`
    // (0, 1, 2…), et non son `fileIndex` d'origine. Après le retrait d'un
    // fichier, les indices d'origine présentent un trou — 1 et 2 — alors que
    // le FormData ne contient plus que deux entrées, numérotées 0 et 1. Le
    // serveur indexant le lot par sa position réelle, réutiliser l'ancien
    // index aurait décalé chaque photo et inversé l'ordre à l'écran.
    const rangEnvoye = new Map(
      parRang.map((item, position) => [item, position]),
    );

    donnees.set(
      "photosOrder",
      JSON.stringify(
        items.map((item) =>
          item.kind === "file"
            ? `file:${rangEnvoye.get(item) ?? 0}`
            : photoToken(item),
        ),
      ),
    );

    setErreurGlobale(null);
    setErreurs({});

    demarrerEnvoi(async () => {
      try {
        const resultat = await saveProperty(null, donnees);

        // Succès : l'action a redirigé vers la liste, il n'y a rien à faire.
        if (resultat) {
          setErreurGlobale(resultat.error);
          setErreurs(resultat.fieldErrors);

          if (Object.keys(resultat.fieldErrors).length > 0) {
            document
              .querySelector("[aria-invalid='true']")
              ?.scrollIntoView({ block: "center", behavior: "smooth" });
          }
        }
      } catch {
        setErreurGlobale(
          "L'enregistrement a échoué. Vérifiez votre connexion et réessayez.",
        );
      }
    });
  }

  const modification = bien !== null;

  return (
    <form onSubmit={soumettre} noValidate className="flex flex-col gap-8">
      <input type="hidden" name="id" value={bien?.id ?? ""} />

      <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground sm:p-8">
        <h2 className="text-lg font-semibold text-foreground">Informations</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Les champs marqués d&apos;un astérisque sont obligatoires.
        </p>

        <div className="mt-6 flex flex-col gap-5">
          <AdminInput
            id="titre"
            name="title"
            label="Titre du bien *"
            value={champs.title}
            onValueChange={majCle("title")}
            maxLength={160}
            required
            error={erreurs.title}
          />

          <AdminTextarea
            id="description"
            name="description"
            label="Description"
            value={champs.description}
            onValueChange={majCle("description")}
            maxLength={5000}
            rows={6}
            placeholder="Décrivez le bien : surface, pièces, étage, état, commodités à proximité…"
            hint="Facultatif. Visible sur la fiche publique du bien."
            error={erreurs.description}
          />

          <AdminInput
            id="localisation"
            name="location"
            label="Localisation (quartier, ville) *"
            value={champs.location}
            onValueChange={majCle("location")}
            maxLength={160}
            required
            error={erreurs.location}
          />

          <AdminInput
            id="prix"
            name="price"
            label="Prix *"
            type="text"
            inputMode="numeric"
            suffix="FCFA"
            value={champs.price}
            onValueChange={(valeur) => {
              // Seuls les chiffres sont acceptés à la frappe : un prix est un
              // entier, et cela évite d'avoir à rejeter une saisie au submit.
              const chiffres = valeur.replace(/[^\d]/g, "");
              majCle("price")(chiffres);
            }}
            required
            error={erreurs.price}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <AdminSelect
              id="type"
              name="type"
              label="Type de bien *"
              value={champs.type}
              options={PROPERTY_TYPES}
              onValueChange={(valeur) =>
                setChamps((c) => ({ ...c, type: valeur as PropertyType }))
              }
              error={erreurs.type}
            />

            <AdminSelect
              id="transaction"
              name="transaction"
              label="Type de transaction *"
              value={champs.transaction}
              options={TRANSACTION_TYPES}
              onValueChange={(valeur) =>
                setChamps((c) => ({
                  ...c,
                  transaction: valeur as TransactionType,
                }))
              }
              error={erreurs.transaction}
            />
          </div>

          <AdminSelect
            id="status"
            name="status"
            label="Statut *"
            value={champs.status}
            options={PROPERTY_STATUSES}
            onValueChange={(valeur) =>
              setChamps((c) => ({ ...c, status: valeur as PropertyStatus }))
            }
            hint={
              modification
                ? "Un bien « loué » ou « vendu » reste en ligne, mais n'est plus proposé à la vente."
                : "Un nouveau bien est « disponible » par défaut."
            }
            error={erreurs.status}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground sm:p-8">
        <h2 className="text-lg font-semibold text-foreground">Photos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {modification
            ? "Ajoutez, retirez ou réordonnez les photos : chaque changement est enregistré immédiatement."
            : "Les photos seront envoyées dans le bucket « properties » au moment de l'enregistrement."}
        </p>

        <div className="mt-6">
          <PhotoManager
            propertyId={bien?.id ?? null}
            items={items}
            onItemsChange={setItems}
            disabled={envoi}
          />
        </div>
      </div>

      {erreurGlobale ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {erreurGlobale}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" size="lg">
          <Link href="/admin/biens">Annuler</Link>
        </Button>

        <Button type="submit" size="lg" disabled={envoi} aria-busy={envoi}>
          {envoi ? (
            <>
              <Loader2 aria-hidden="true" className="animate-spin" />
              Enregistrement…
            </>
          ) : (
            <>
              {modification ? (
                <Save aria-hidden="true" />
              ) : (
                <Check aria-hidden="true" />
              )}
              Enregistrer
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
