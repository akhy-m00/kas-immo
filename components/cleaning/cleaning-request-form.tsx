"use client";

import { useActionState, useEffect, useState } from "react";
import { CalendarCheck, CheckCircle2, Loader2, TriangleAlert } from "lucide-react";

import {
  submitCleaningQuoteRequest,
  type CleaningQuoteFormState,
} from "@/app/cleaning/actions";
import { CleaningTypeField } from "@/components/cleaning/cleaning-type-field";
import { FloatingField } from "@/components/motion/FloatingField";
import { ChampDateHeure, limiteDeSelection } from "@/components/requests/champ-date-heure";
import { Button } from "@/components/ui/button";
import {
  CRENEAU_HEURE_MAX,
  CRENEAU_HEURE_MIN,
  CRENEAU_JOURS_MAX,
  REQUEST_MESSAGE_MAX,
  REQUEST_NAME_MAX,
  REQUEST_PHONE_MAX,
  aujourdhuiAuSite,
} from "@/lib/requests";
import { getProfileContact } from "@/lib/supabase/browser-session";
import type { CleaningType } from "@/lib/supabase/database.types";

/**
 * Formulaire de demande de rendez-vous Cleaning, au corps de `/cleaning`.
 *
 * Ce n'est pas une modale : il n'y a plus de catalogue ni de fiche, donc plus
 * d'objet depuis lequel il faudrait ouvrir une fenêtre. La page EST le
 * formulaire, ce qui supprime un cran de navigation et rend le parcours plus
 * simple — le visiteur arrive, il demande.
 *
 * Le squelette est repris de `request-quote-dialog.tsx` : `useActionState`,
 * préremplissage depuis le compte, confirmation en ligne, aucune alerte
 * navigateur. Seule la mécanique change.
 *
 * Aucun composant serveur n'est importé ici : la page reste mise en cache et ne
 * lit donc aucune session. C'est ce composant, monté au chargement, qui va
 * chercher le nom et le téléphone du profil.
 *
 * La session n'est lue qu'au confort du remplissage : les valeurs restent
 * saisies par l'utilisateur et sont validées côté serveur comme si elles l'étaient
 * été. Préremplir n'est donc jamais un droit.
 */
export function CleaningRequestForm() {
  const [etat, action, enAttente] = useActionState<
    CleaningQuoteFormState,
    FormData
  >(submitCleaningQuoteRequest, null);

  const [cleaningType, setCleaningType] = useState<CleaningType | "">("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [desiredDate, setDesiredDate] = useState("");
  const [desiredTime, setDesiredTime] = useState("");
  const [message, setMessage] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  /**
   * Préremplissage depuis le compte connecté.
   *
   * `setX(valeur => valeur || ...)` : le remplissage n'écrase jamais une saisie,
   * il ne comble qu'un champ resté vide. Un visiteur non connecté obtient `null`
   * et les deux champs restent vides, qu'il renseigne.
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
    return <Confirmation />;
  }

  const erreurGlobale = etat?.error ?? null;
  const erreurs = etat?.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <CleaningTypeField
        name="cleaningType"
        value={cleaningType}
        onValueChange={setCleaningType}
        error={erreurs.cleaningType}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <ChampDateHeure
          id="rendez-vous-date"
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
          id="rendez-vous-heure"
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

      {erreurGlobale && Object.keys(erreurs).length === 0 ? (
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
          id="rendez-vous-nom"
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
          id="rendez-vous-telephone"
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

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor="rendez-vous-message"
            className="text-sm font-medium text-foreground"
          >
            Message{" "}
            <span className="font-normal text-muted-foreground">
              (facultatif)
            </span>
          </label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {message.length} / {REQUEST_MESSAGE_MAX}
          </span>
        </div>

        <textarea
          id="rendez-vous-message"
          name="message"
          rows={4}
          maxLength={REQUEST_MESSAGE_MAX}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Type de bien, surface, étage, accessibilité, préférences…"
          aria-invalid={erreurs.message ? true : undefined}
          aria-describedby={erreurs.message ? "rendez-vous-message-erreur" : undefined}
          className="w-full resize-y rounded-lg border border-input bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-brand-text focus-visible:ring-3 focus-visible:ring-brand-text/20"
        />

        {erreurs.message ? (
          <p
            id="rendez-vous-message-erreur"
            role="alert"
            className="px-1 text-sm font-medium text-destructive"
          >
            {erreurs.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-6">
        {/* `disabled` pendant l'envoi : une double soumission créerait deux
            lignes dans `requests`, et le visiteur n'en verrait qu'une. */}
        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto sm:self-end"
          disabled={enAttente}
          aria-busy={enAttente}
        >
          {enAttente ? (
            <>
              <Loader2 aria-hidden="true" className="animate-spin" />
              Envoi en cours…
            </>
          ) : (
            <>
              <CalendarCheck aria-hidden="true" />
              Demander un rendez-vous
            </>
          )}
        </Button>

        <p className="text-xs leading-relaxed text-muted-foreground sm:text-right">
          Il s&apos;agit d&apos;une demande de rendez-vous : KAS Cleaning vous
          recontacte au numéro indiqué pour confirmer le créneau.
        </p>
      </div>
    </form>
  );
}

// =============================================================================
// Confirmation
// =============================================================================

/**
 * Confirmation en ligne, jamais une alerte navigateur.
 *
 * Le libellé dit deux choses volontairement : que la demande est ENREGISTRÉE,
 * et qu'elle n'est pas encore confirmée. « Rendez-vous confirmé » ferait croire
 * à une réservation acquise, alors que rien n'a été réservé — l'administrateur
 * doit encore traiter la demande.
 */
function Confirmation() {
  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-text">
        <CheckCircle2 aria-hidden="true" className="size-7" />
      </span>

      <div>
        <h3 className="font-heading text-xl font-semibold text-foreground">
          Demande envoyée
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Votre demande de rendez-vous a bien été enregistrée. KAS Cleaning vous
          recontactera prochainement au numéro indiqué pour confirmer le créneau.
        </p>
      </div>

      <p className="rounded-lg bg-muted px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        Sans compte ? Aucun souci : gardez ce numéro de téléphone, c&apos;est par
        lui que nous vous rappelons.
      </p>
    </div>
  );
}