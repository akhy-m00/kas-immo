"use client";

import { useActionState, useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageSquareQuote, TriangleAlert } from "lucide-react";

import {
  submitCleaningQuoteRequest,
  type CleaningQuoteFormState,
} from "@/app/cleaning/actions";
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
  REQUEST_MESSAGE_MAX,
  REQUEST_NAME_MAX,
  REQUEST_PHONE_MAX,
} from "@/lib/requests";
import { getProfileContact } from "@/lib/supabase/browser-session";

/**
 * Demande de devis pour une prestation Cleaning, ouverte depuis sa carte.
 *
 * Même mécanisme que `RequestVisitDialog`, transposé sur un objet qui n'a pas de
 * page de détail : c'est la carte qui porte l'action, et elle transmet
 * l'identifiant de la prestation dans un champ caché.
 *
 * ⚠️ La prestation n'est PAS proposée dans une liste déroulante. Le visiteur a
 * cliqué sur une carte précise : la lui faire choisir à nouveau serait lui
 * demander de recopier une information qu'il vient de donner, et l'on ouvrirait
 * la porte à une demande rattachée à la mauvaise prestation.
 *
 * Aucun composant serveur n'est importé ici : la page `/cleaning` reste mise en
 * cache (ISR) et ne lit donc aucune session. C'est ce composant, monté à
 * l'ouverture de la modale, qui va chercher le nom et le téléphone du profil.
 *
 * La session n'est lue qu'au confort du remplissage : les valeurs restent
 * saisies par l'utilisateur et sont validées côté serveur comme si elles l'étaient
 * été. Préremplir n'est donc jamais un droit.
 */

type RequestQuoteDialogProps = {
  /** Identifiant de la prestation, revérifié côté serveur avant insertion. */
  cleaningServiceId: string;
  /** Nom de la prestation, rappelé dans la modale et la confirmation. */
  cleaningServiceTitle: string;
  className?: string;
};

export function RequestQuoteDialog({
  cleaningServiceId,
  cleaningServiceTitle,
  className,
}: RequestQuoteDialogProps) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>
        <Button size="lg" className={className}>
          <MessageSquareQuote aria-hidden="true" />
          Demander un devis
        </Button>
      </DialogTrigger>

      {/* La modale n'est montée qu'à l'ouverture : le formulaire repart donc
          d'un état vierge à chaque demande, sans avoir à réinitialiser
          manuellement les champs ni l'état renvoyé par l'action. */}
      {ouvert ? (
        <DialogContent>
          <QuoteForm
            cleaningServiceId={cleaningServiceId}
            cleaningServiceTitle={cleaningServiceTitle}
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

function QuoteForm({
  cleaningServiceId,
  cleaningServiceTitle,
  onClose,
}: {
  cleaningServiceId: string;
  cleaningServiceTitle: string;
  onClose: () => void;
}) {
  const [etat, action, enAttente] = useActionState<CleaningQuoteFormState, FormData>(
    submitCleaningQuoteRequest,
    null,
  );

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
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
    return (
      <Confirmation
        cleaningServiceTitle={cleaningServiceTitle}
        onClose={onClose}
      />
    );
  }

  const erreurGlobale = etat?.error ?? null;
  const erreurs = etat?.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="cleaningServiceId" value={cleaningServiceId} />

      <DialogHeader>
        <DialogTitle>Demander un devis</DialogTitle>
        <DialogDescription>
          Prestation concernée :{" "}
          <span className="font-medium text-foreground">
            {cleaningServiceTitle}
          </span>
        </DialogDescription>
      </DialogHeader>

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
          id="devis-nom"
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
          id="devis-telephone"
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
            htmlFor="devis-message"
            className="text-sm font-medium text-foreground"
          >
            Message <span className="font-normal text-muted-foreground">(facultatif)</span>
          </label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {message.length} / {REQUEST_MESSAGE_MAX}
          </span>
        </div>

        <textarea
          id="devis-message"
          name="message"
          rows={4}
          maxLength={REQUEST_MESSAGE_MAX}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Type de bien, surface, fréquence souhaitée, disponibilités…"
          aria-invalid={erreurs.message ? true : undefined}
          aria-describedby={erreurs.message ? "devis-message-erreur" : undefined}
          className="w-full resize-y rounded-lg border border-input bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-brand-text focus-visible:ring-3 focus-visible:ring-brand-text/20"
        />

        {erreurs.message ? (
          <p
            id="devis-message-erreur"
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
  cleaningServiceTitle,
  onClose,
}: {
  cleaningServiceTitle: string;
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
          Votre demande de devis a bien été envoyée pour{" "}
          <span className="font-medium text-foreground">
            {cleaningServiceTitle}
          </span>
          . KAS Cleaning vous contactera prochainement.
        </DialogDescription>
      </div>

      <Button type="button" size="lg" className="w-full sm:w-auto" onClick={onClose}>
        Fermer
      </Button>
    </div>
  );
}