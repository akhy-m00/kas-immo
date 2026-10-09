"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { CalendarCheck, CheckCircle2, Loader2, TriangleAlert } from "lucide-react";

import {
  submitVisitRequest,
  type VisitRequestFormState,
} from "@/app/immobilier/[id]/actions";
import { FloatingField } from "@/components/motion/FloatingField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CRENEAU_HEURE_MAX,
  CRENEAU_HEURE_MIN,
  CRENEAU_JOURS_MAX,
  REQUEST_MESSAGE_MAX,
  REQUEST_NAME_MAX,
  REQUEST_PHONE_MAX,
  aujourdhuiAuSite,
  formatCreneau,
} from "@/lib/requests";
import {
  ChampDateHeure,
  limiteDeSelection,
} from "@/components/requests/champ-date-heure";
import { getProfileContact } from "@/lib/supabase/browser-session";

/**
 * Formulaire de demande de visite, ouvert depuis la fiche d'un bien.
 *
 * Aucun composant serveur n'est importé ici : la fiche reste une page mise en
 * cache (ISR) et ne lit donc aucune session. C'est ce composant, monté à
 * l'ouverture de la modale, qui va chercher le nom et le téléphone du profil
 * pour les préremplir. C'est le même mécanisme que le menu utilisateur du
 * header, qui lit sa session dans le navigateur pour ne pas rendre le header
 * dynamique.
 *
 * Le formulaire ne demande QUE le nom, le téléphone, la date et l'heure
 * souhaitées, plus un message facultatif. Ni l'e-mail ni l'identifiant du
 * compte n'y figurent : l'adresse appartient à `auth.users`, et l'identité du
 * demandeur est déduite de la session côté serveur. Les redemander ici
 * dupliquerait une donnée qui a déjà une source de vérité, et risquerait de
 * diverger d'elle.
 *
 * La session n'est lue qu'au confort du remplissage : toutes les valeurs
 * restent saisies par l'utilisateur et sont validées côté serveur comme si
 * elles l'étaient été. Préremplir n'est donc jamais un droit.
 */

type RequestVisitDialogProps = {
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  /** Le texte du bouton d'ouverture, pour rester cohérent avec la mise en page. */
  className?: string;
};

export function RequestVisitDialog({
  propertyId,
  propertyTitle,
  propertyLocation,
  className,
}: RequestVisitDialogProps) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>
        <Button size="lg" className={className}>
          <CalendarCheck aria-hidden="true" />
          Demander une visite
        </Button>
      </DialogTrigger>

      {/* La modale n'est montée qu'à l'ouverture : le formulaire repart donc
          d'un état vierge à chaque demande, sans avoir à réinitialiser
          manuellement les champs ni l'état renvoyé par l'action. */}
      {ouvert ? (
        <DialogContent>
          <VisitRequestForm
            propertyId={propertyId}
            propertyTitle={propertyTitle}
            propertyLocation={propertyLocation}
            onClose={() => setOuvert(false)}
          />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

// =============================================================================
// Formulaire
// =============================================================================

function VisitRequestForm({
  propertyId,
  propertyTitle,
  propertyLocation,
  onClose,
}: {
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  onClose: () => void;
}) {
  const [etat, action, enAttente] = useActionState<VisitRequestFormState, FormData>(
    submitVisitRequest,
    null,
  );

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [desiredDate, setDesiredDate] = useState("");
  const [desiredTime, setDesiredTime] = useState("");
  const [message, setMessage] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  const titreId = useId();
  const descriptionId = useId();

  /**
   * Préremplissage depuis le compte connecté.
   *
   * `setX(valeur => valeur || ...)` : le remplissage n'écrase jamais une saisie,
   * il ne comble qu'un champ resté vide.
   *
   * Ni l'e-mail ni l'identifiant du compte ne sont repris ici : l'adresse
   * appartient au compte, et l'identité du demandeur est déduite de la session
   * côté serveur, jamais transmise par le formulaire.
   */
  useEffect(() => {
    let actif = true;

    void getProfileContact().then((profil) => {
      if (!actif || !profil) return;

      setFullName((valeur) => valeur || profil.fullName);
      setPhone((valeur) => valeur || profil.phone);
      setPrefilled(true);
    });

    return () => {
      actif = false;
    };
  }, []);

  if (etat?.ok) {
    return (
      <Confirmation
        propertyTitle={propertyTitle}
        creneau={formatCreneau(
          // La date et l'heure saisies sont relues depuis le DOM : l'état de
          // l'action ne les contient pas, et afficher « votre créneau » sans
          // le rappeler laisserait le demandeur sans confirmation de ce qu'il a
          // réellement demandé.
          valeurDuChamp("desiredDate"),
          valeurDuChamp("desiredTime"),
        )}
        onClose={onClose}
      />
    );
  }

  const erreurGlobale = etat?.error ?? null;
  const erreurs = etat?.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="propertyId" value={propertyId} />

      <DialogHeader>
        <DialogTitle id={titreId}>Demander une visite</DialogTitle>
        <DialogDescription id={descriptionId}>
          {propertyTitle} · {propertyLocation}
        </DialogDescription>
      </DialogHeader>

      {erreurGlobale && erreurs && Object.keys(erreurs).length === 0 ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {erreurGlobale}
        </p>
      ) : null}

      {prefilled ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Vos informations de contact ont été reprises depuis votre compte. Vous
          pouvez les corriger.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FloatingField
          id="visite-nom"
          name="fullName"
          label="Nom complet"
          autoComplete="name"
          value={fullName}
          onValueChange={setFullName}
          maxLength={REQUEST_NAME_MAX}
          required
          error={erreurs.fullName}
        />

        <FloatingField
          id="visite-telephone"
          name="phone"
          label="Téléphone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onValueChange={setPhone}
          maxLength={REQUEST_PHONE_MAX}
          required
          error={erreurs.phone}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ChampDateHeure
          id="visite-date"
          name="desiredDate"
          label="Date souhaitée"
          type="date"
          value={desiredDate}
          onValueChange={setDesiredDate}
          min={aujourdhuiAuSite()}
          max={limiteDeSelection(CRENEAU_JOURS_MAX)}
          error={erreurs.desiredDate}
        />

        <ChampDateHeure
          id="visite-heure"
          name="desiredTime"
          label="Heure souhaitée"
          type="time"
          value={desiredTime}
          onValueChange={setDesiredTime}
          min={CRENEAU_HEURE_MIN}
          max={CRENEAU_HEURE_MAX}
          error={erreurs.desiredTime}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor="visite-message"
            className="text-sm font-medium text-foreground"
          >
            Message <span className="font-normal text-muted-foreground">(facultatif)</span>
          </label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {message.length} / {REQUEST_MESSAGE_MAX}
          </span>
        </div>

        <textarea
          id="visite-message"
          name="message"
          rows={3}
          maxLength={REQUEST_MESSAGE_MAX}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Précisions sur le bien, vos disponibilités, questions…"
          aria-invalid={erreurs.message ? true : undefined}
          aria-describedby={erreurs.message ? "visite-message-erreur" : undefined}
          className="w-full resize-y rounded-lg border border-input bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-brand-text focus-visible:ring-3 focus-visible:ring-brand-text/20"
        />

        {erreurs.message ? (
          <p
            id="visite-message-erreur"
            role="alert"
            className="px-1 text-sm font-medium text-destructive"
          >
            {erreurs.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onClose}
          disabled={enAttente}
        >
          Annuler
        </Button>

        <Button type="submit" size="lg" disabled={enAttente} aria-busy={enAttente}>
          {enAttente ? (
            <>
              <Loader2 aria-hidden="true" className="animate-spin" />
              Envoi en cours…
            </>
          ) : (
            "Envoyer ma demande"
          )}
        </Button>
      </div>
    </form>
  );
}

// =============================================================================
// Confirmation
// =============================================================================

function Confirmation({
  propertyTitle,
  creneau,
  onClose,
}: {
  propertyTitle: string;
  creneau: string;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-text">
        <CheckCircle2 aria-hidden="true" className="size-7" />
      </span>

      <div>
        <DialogTitle>Demande envoyée</DialogTitle>
        <DialogDescription className="mt-2">
          Nous avons bien reçu votre demande de visite pour{" "}
          <span className="font-medium text-foreground">{propertyTitle}</span>
          {creneau ? <> pour le {creneau}</> : null}. Notre équipe vous rappelle
          au numéro indiqué pour confirmer le créneau.
        </DialogDescription>
      </div>

      <Button type="button" size="lg" className="w-full sm:w-auto" onClick={onClose}>
        Fermer
      </Button>
    </div>
  );
}

// =============================================================================
// Utilitaires
// =============================================================================

/**
 * Relit la valeur d'un champ du formulaire.
 *
 * Utilisé après un envoi réussi, quand l'état renvoyé par l'action ne contient
 * que la confirmation : la date et l'heure saisies sont alors lues dans le
 * formulaire lui-même, qui est encore monté.
 */
function valeurDuChamp(nom: string): string | null {
  if (typeof document === "undefined") return null;

  const champ = document.querySelector<HTMLInputElement>(
    `input[name="${nom}"]`,
  );

  return champ?.value || null;
}
