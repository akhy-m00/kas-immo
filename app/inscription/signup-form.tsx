"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { motion } from "motion/react";

import { GoogleButton } from "@/components/auth/google-button";
import { FloatingField } from "@/components/motion/FloatingField";
import { Button } from "@/components/ui/button";
import { DURATION, EASE_PRO } from "@/lib/animations";
import {
  INDICE_TELEPHONE,
  MESSAGE_TELEPHONE_INVALIDE,
  normaliserTelephoneSenegalais,
} from "@/lib/phone";
import { getOwnRole, signUp } from "@/lib/supabase/auth-client";
import { homeForRole } from "@/lib/supabase/routes";

const LONGUEUR_MDP_MIN = 8;

type FieldErrors = Partial<
  Record<"prenom" | "nom" | "telephone" | "motDePasse" | "confirmation", string>
>;

const MESSAGES = {
  prenomVide: "Indiquez votre prénom.",
  prenomCourt: "Indiquez au moins 2 caractères.",
  nomVide: "Indiquez votre nom.",
  nomCourt: "Indiquez au moins 2 caractères.",
  telephoneInvalide: MESSAGE_TELEPHONE_INVALIDE,
  motDePasseCourt: `Le mot de passe doit contenir au moins ${LONGUEUR_MDP_MIN} caractères.`,
  confirmationVide: "Saisissez à nouveau votre mot de passe.",
  confirmationDifferente: "Les deux mots de passe ne correspondent pas.",
} as const;

export function SignupForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors: FieldErrors = {};

    const trimmedFirstName = firstName.trim();
    if (!trimmedFirstName) errors.prenom = MESSAGES.prenomVide;
    else if (trimmedFirstName.length < 2) errors.prenom = MESSAGES.prenomCourt;

    const trimmedLastName = lastName.trim();
    if (!trimmedLastName) errors.nom = MESSAGES.nomVide;
    else if (trimmedLastName.length < 2) errors.nom = MESSAGES.nomCourt;

    if (password.length < LONGUEUR_MDP_MIN) {
      errors.motDePasse = MESSAGES.motDePasseCourt;
    }

    if (!confirmation) {
      errors.confirmation = MESSAGES.confirmationVide;
    } else if (confirmation !== password) {
      errors.confirmation = MESSAGES.confirmationDifferente;
    }

    // Le numéro est normalisé AVANT l'appel à Supabase : c'est cette valeur
    // E.164 qui sert d'identifiant, de clé de compte et qui est stockée dans
    // `profiles.phone`. Une saisie locale échouerait sinon.
    const normalizedPhone = normaliserTelephoneSenegalais(phone);
    if (!normalizedPhone) errors.telephone = MESSAGES.telephoneInvalide;

    setFieldErrors(errors);
    // `!normalizedPhone` est redéclaré ici parce que le typeScript ne propage
    // pas le rétrécissement à travers l'accumulation d'erreurs : sans cette
    // seconde condition, le numéro resterait `string | null` plus bas.
    if (Object.keys(errors).length > 0 || !normalizedPhone) return;

    setPending(true);

    // `profiles` ne connaît qu'un `full_name` texte : le prénom et le nom saisis
    // sont donc réunis ici, et c'est cette chaîne que le déclencheur recopie.
    const fullName = `${trimmedFirstName} ${trimmedLastName}`;

    const { error } = await signUp({
      phone: normalizedPhone,
      password,
      fullName,
    });

    if (error) {
      setFormError(error);
      setPending(false);
      return;
    }

    const role = await getOwnRole();

    // Navigation complète, et non `router.replace` : le lien de connexion du
    // header est rendu par le layout, donc par le serveur. Une transition côté
    // client réutilise le layout déjà en cache et laisserait « Connexion »
    // affiché alors que la session vient d'être ouverte ; `router.refresh()`
    // ne corrige pas ce cas. Le surcoût est un aller-retur, au moment précis
    // où l'utilisateur vient de s'authentifier.
    window.location.assign(homeForRole(role));
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground sm:p-8">
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <FloatingField
            id="prenom"
            name="firstName"
            type="text"
            autoComplete="given-name"
            label="Prénom"
            value={firstName}
            onValueChange={setFirstName}
            error={fieldErrors.prenom}
            required
          />
          <FloatingField
            id="nom"
            name="lastName"
            type="text"
            autoComplete="family-name"
            label="Nom"
            value={lastName}
            onValueChange={setLastName}
            error={fieldErrors.nom}
            required
          />
        </div>

        <div className="mt-5 flex flex-col gap-5">
          <FloatingField
            id="telephone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            label="Numéro de téléphone"
            hint={INDICE_TELEPHONE}
            value={phone}
            onValueChange={setPhone}
            error={fieldErrors.telephone}
            required
          />
          <FloatingField
            id="mot-de-passe"
            name="password"
            type="password"
            autoComplete="new-password"
            label="Mot de passe"
            value={password}
            onValueChange={setPassword}
            error={fieldErrors.motDePasse}
            minLength={LONGUEUR_MDP_MIN}
            required
          />
          <FloatingField
            id="confirmation"
            name="confirmation"
            type="password"
            autoComplete="new-password"
            label="Confirmer le mot de passe"
            value={confirmation}
            onValueChange={setConfirmation}
            error={fieldErrors.confirmation}
            required
          />
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending}
          className="mt-7 h-12 w-full text-base"
        >
          {pending ? "Création du compte…" : "Créer mon compte"}
        </Button>

        {formError ? (
          <motion.p
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.fast, ease: EASE_PRO }}
            className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          >
            {formError}
          </motion.p>
        ) : null}
      </form>

      {/* Google reste accessible, mais clairement en second : le parcours
          téléphone est celui que le site pousse, et il est le seul qui ne
          dépende d'aucun service tiers payant. */}
      <div className="mt-8 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          ou
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <p className="mt-4 mb-3 text-center text-xs text-muted-foreground">
        Méthode secondaire, si vous préférez votre compte Google.
      </p>

      <GoogleButton />

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Déjà inscrit ?{" "}
        <Link
          href="/connexion"
          className="font-semibold text-brand-text underline-offset-4 hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}
