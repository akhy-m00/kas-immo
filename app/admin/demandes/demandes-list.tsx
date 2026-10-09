"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Inbox,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Sparkles,
  Trash2,
} from "lucide-react";

import { deleteRequestAction, updateRequestStatusAction } from "@/app/admin/demandes/actions";
import { RequestStatusBadge } from "@/components/admin/request-status-badge";
import { Button } from "@/components/ui/button";
import {
  REQUEST_STATUSES,
  REQUEST_TYPE_LABELS,
  estStatutEnAttente,
  formatCreneau,
  formatDateTime,
  lienObjetDemande,
  objetDeLaDemande,
  type RequestWithProperty,
} from "@/lib/requests";

/**
 * Liste des demandes reçues, avec le changement de statut et la suppression.
 *
 * Deux publics, deux lectures : le demandeur doit pouvoir rappeler son nom,
 * son numéro et l'objet exact du créneau, et l'administrateur doit agir sans
 * ouvrir une fiche. Tout tient donc sur une ligne, sans repli à unfold.
 *
 * Le sélecteur de statut est un `<select>` natif et non un menu custom : il
 * porte la liste exhaustive des cinq statuts, se parcourt au clavier et se
 * comprend sans explication, ce qui est exactement ce qu'on attend d'un
 * changement d'état dans une file de traitement.
 *
 * Le changement de statut passe par `useTransition` plutôt que par un
 * `revalidatePath` suivi d'un `router.refresh()` explicite : l'action invalide
 * déjà elle-même `/admin/demandes` et `/admin`. Le rafraîchissement affiché ici
 * ne sert qu'après une suppression, ou si l'action échoue.
 */
export function DemandesList({
  demandes,
  /** Nombre total, hors filtre : affiché dans le message de liste vide. */
  total,
  /** `true` si des filtres sont actifs : la liste vide est alors un résultat. */
  filtreActif,
}: {
  demandes: RequestWithProperty[];
  total: number;
  filtreActif: boolean;
}) {
  if (demandes.length === 0) {
    return <ListeVide filtreActif={filtreActif} total={total} />;
  }

  return (
    <ul className="grid gap-4">
      {demandes.map((demande) => (
        <CarteDemande key={demande.id} demande={demande} />
      ))}
    </ul>
  );
}

// =============================================================================
// Carte d'une demande
// =============================================================================

function CarteDemande({ demande }: { demande: RequestWithProperty }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirme, setConfirme] = useState(false);
  const [enAttente, demarrer] = useTransition();

  const lienObjet = lienObjetDemande(demande);
  const objet = objetDeLaDemande(demande);
  const creneau = formatCreneau(demande.desired_date, demande.desired_time);

  function changerStatut(statut: string) {
    setErreur(null);

    demarrer(async () => {
      const resultat = await updateRequestStatusAction(demande.id, statut);

      if (!resultat.ok) {
        setErreur(resultat.error);
        return;
      }

      // La liste vient du serveur : le badge doit refléter la nouvelle valeur
      // avant que le rafraîchissement n'arrive, sinon l'ancien libellé reste
      // affiché le temps d'un aller-retour.
      router.refresh();
    });
  }

  function supprimer() {
    setErreur(null);

    demarrer(async () => {
      const resultat = await deleteRequestAction(demande.id);

      if (!resultat.ok) {
        setErreur(resultat.error);
        return;
      }

      setConfirme(false);
      router.refresh();
    });
  }

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* -------------------------------------------------------- objet */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
            {demande.type === "devis_cleaning" ? (
              <Sparkles aria-hidden="true" className="size-3" />
            ) : (
              <Building2 aria-hidden="true" className="size-3" />
            )}
            {REQUEST_TYPE_LABELS[demande.type]}
          </span>

          {lienObjet ? (
            <Link
              href={lienObjet}
              className="font-heading font-semibold text-foreground underline-offset-4 hover:underline"
            >
              {objet}
            </Link>
          ) : (
            // Le bien a été supprimé après la demande : elle doit rester
            // visible et traitable, pas disparaître de la file.
            <span className="font-heading font-semibold text-muted-foreground">
              {objet}
            </span>
          )}

          {demande.property ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin aria-hidden="true" className="size-3" />
              {demande.property.location}
            </span>
          ) : null}
        </div>

        {/* ----------------------------------------------------- contact */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          <span className="font-semibold text-foreground">{demande.full_name}</span>

          <a
            href={`tel:${demande.phone.replace(/\s+/g, "")}`}
            className="inline-flex items-center gap-1.5 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <Phone aria-hidden="true" className="size-3.5 shrink-0" />
            {demande.phone}
          </a>
        </div>

        {/* ---------------------------------------------------- créneau */}
        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {creneau ? (
            <div className="flex gap-1.5">
              <dt>Créneau demandé</dt>
              <dd className="font-medium text-foreground">{creneau}</dd>
            </div>
          ) : null}

          <div className="flex gap-1.5">
            <dt>Reçue le</dt>
            <dd className="font-medium text-foreground">
              {formatDateTime(demande.created_at)}
            </dd>
          </div>

          {/* Seule distinction utile ici : la demande vient-elle d'un compte, ou d'un
              visiteur ? Elle décide du suivi — un visiteur n'a aucun e-mail
              consultable ailleurs dans le site, il n'existe que par ce numéro
              de téléphone. */}
          <div className="flex gap-1.5">
            <dt>Compte</dt>
            <dd className="font-medium text-foreground">
              {demande.user_id ? "Connecté" : "Visiteur non connecté"}
            </dd>
          </div>
        </dl>

        {demande.message ? (
          <p className="flex gap-2 rounded-lg bg-muted px-3 py-2 text-sm leading-relaxed text-muted-foreground">
            <MessageSquare aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 break-words">{demande.message}</span>
          </p>
        ) : null}

        {erreur ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            {erreur}
          </p>
        ) : null}
      </div>

      {/* ------------------------------------------------------- actions */}
      <div className="flex shrink-0 flex-col gap-2 lg:w-72">
        <div className="flex items-center gap-2">
          <RequestStatusBadge status={demande.status} />

          {estStatutEnAttente(demande.status) ? (
            <span className="text-xs font-medium text-brand-text">
              À traiter
            </span>
          ) : null}
        </div>

        <label
          htmlFor={`statut-${demande.id}`}
          className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
        >
          Changer le statut
        </label>

        <select
          id={`statut-${demande.id}`}
          value={demande.status}
          onChange={(event) => changerStatut(event.target.value)}
          disabled={enAttente}
          aria-busy={enAttente}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-brand-text focus-visible:ring-3 focus-visible:ring-brand-text/20 disabled:opacity-60"
        >
          {REQUEST_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Aucune e-mail ici : la demande ne le porte pas. Pour un demandeur
            connecté, l'adresse se consulte sur son compte ; pour un visiteur,
            il n'y en a pas. Le téléphone est le seul canal de rappel. */}
        {confirme ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm font-medium text-foreground">
              Supprimer définitivement cette demande de {demande.full_name}&nbsp;?
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirme(true)}
            disabled={enAttente}
            aria-label={`Supprimer la demande de ${demande.full_name}`}
            className="self-start text-muted-foreground hover:text-destructive"
          >
            <Trash2 aria-hidden="true" />
            Supprimer la demande
          </Button>
        )}
      </div>
    </li>
  );
}

// =============================================================================
// Liste vide
// =============================================================================

function ListeVide({
  filtreActif,
  total,
}: {
  filtreActif: boolean;
  total: number;
}) {
  if (filtreActif) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
        <p className="font-semibold text-foreground">
          Aucune demande pour ces critères
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {total > 0
            ? `${total} demande${total > 1 ? "s" : ""} existent${total > 1 ? "s" : ""} dans la file : élargissez la recherche ou réinitialisez les filtres.`
            : "Aucune demande n'a encore été reçue."}
        </p>

        {total > 0 ? (
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link href="/admin/demandes">Réinitialiser les filtres</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
      <Inbox aria-hidden="true" className="size-7 text-muted-foreground" />
      <p className="font-semibold text-foreground">Aucune demande reçue</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Les demandes de visite envoyées depuis les fiches de biens apparaîtront
        ici, avec le nom et le numéro du demandeur.
      </p>
    </div>
  );
}