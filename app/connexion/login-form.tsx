"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { immobilierContact } from "@/lib/site";
import {
  getOwnRole,
  requestPasswordReset,
  signInWithEmailPassword,
  signInWithPassword,
} from "@/lib/supabase/auth-client";
import { homeForRole } from "@/lib/supabase/routes";

type FieldErrors = Partial<
  Record<
    | "telephone"
    | "motDePasse"
    | "emailRecuperation"
    | "emailConnexion"
    | "motDePasseEmailConnexion",
    string
  >
>;

const MESSAGES = {
  telephoneInvalide: MESSAGE_TELEPHONE_INVALIDE,
  motDePasseVide: "Saisissez votre mot de passe.",
  accesRefuse: "Accès réservé à l'administration.",
  googleEchoue:
    "La connexion avec Google n'a pas abouti. Réessayez, ou utilisez votre numéro et votre mot de passe.",
  emailRecuperationInvalide: "Saisissez une adresse e-mail valide.",
  emailConnexionInvalide: "Saisissez une adresse e-mail valide.",
  motDePasseEmailConnexionVide: "Saisissez votre mot de passe.",
  confirmationEnvoyee:
    "Si cette adresse correspond à un compte, un e-mail de réinitialisation vient d'être envoyé.",
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * N'accepte qu'un chemin interne.
 *
 * `?suite=` est posé par les gardes de page, mais la valeur reste sous le
 * contrôle du visiteur : sans ce filtre, `?suite=https://site-pirate.com`
 * ferait de la connexion une redirection ouverte.
 */
function safeNext(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

/**
 * Formulaire de connexion par numéro de téléphone et mot de passe.
 *
 * L'identifiant est le numéro, pas l'e-mail : il est normalisé en E.164 avant
 * d'être envoyé à Supabase, sans quoi la connexion échouerait sur une saisie
 * locale pourtant correcte.
 */
export function LoginForm() {
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // Un `?erreur=` peut être posé par le callback OAuth (échec Google) ou par la
  // garde `/admin` (rôle insuffisant) : le message est repris tel quel.
  const [formError, setFormError] = useState<string | null>(() => {
    switch (searchParams.get("erreur")) {
      case "acces-restreint":
        return MESSAGES.accesRefuse;
      case "google":
        return MESSAGES.googleEchoue;
      default:
        return null;
    }
  });

  // Récupération de mot de passe. Sans fournisseur SMS, aucun code ne peut
  // être envoyé à un numéro : on ne promet donc pas de récupération par SMS,
  // on oriente vers l'agence. Le renvoi d'e-mail reste offert pour les
  // comptes créés avant le passage au téléphone.
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [resetPending, setResetPending] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);

  /**
   * Connexion e-mail des comptes antérieurs au numéro.
   *
   * Placé dans un bloc replié et distinct du formulaire principal : les deux
   * parcours ont des identifiants différents, et les mélanger dans un seul
   * champ obligerait à deviner quel mot de passe est attendu.
   */
  const [emailLoginEmail, setEmailLoginEmail] = useState("");
  const [emailLoginPassword, setEmailLoginPassword] = useState("");
  const [emailLoginPending, setEmailLoginPending] = useState(false);
  const [emailLoginNotice, setEmailLoginNotice] = useState<string | null>(null);

  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors: FieldErrors = {};
    if (!password) errors.motDePasse = MESSAGES.motDePasseVide;

    // Normalisation avant validation : c'est la valeur E.164 qui est
    // réellement utilisée comme identifiant.
    const normalizedPhone = normaliserTelephoneSenegalais(phone);
    if (!normalizedPhone) errors.telephone = MESSAGES.telephoneInvalide;

    setFieldErrors(errors);
    // `!normalizedPhone` est redéclaré ici parce que le typeScript ne propage
    // pas le rétrécissement à travers l'accumulation d'erreurs : sans cette
    // seconde condition, le numéro resterait `string | null` plus bas.
    if (Object.keys(errors).length > 0 || !normalizedPhone) return;

    setPending(true);

    const { error } = await signInWithPassword({
      phone: normalizedPhone,
      password,
    });

    if (error) {
      setFormError(error);
      setPending(false);
      return;
    }

    // Le rôle est relu après la connexion : c'est lui qui décide de la page
    // d'atterrissage, un admin ne doit pas retomber sur l'espace client. Un
    // `?suite=` demandé par une garde de page reste prioritaire.
    //
    // Navigation complète, et non `router.replace` : le lien de connexion du
    // header vient du layout, donc du serveur. Une transition côté client
    // réutilise le layout mis en cache et laisserait « Connexion » affiché
    // alors que la session vient d'être ouverte.
    const role = await getOwnRole();
    window.location.assign(safeNext(searchParams.get("suite")) ?? homeForRole(role));
  }

  /** Connexion e-mail : même issue que le parcours téléphone. */
  async function handleEmailLogin() {
    setEmailLoginNotice(null);
    setFieldErrors((current) => ({
      ...current,
      emailConnexion: undefined,
      motDePasseEmailConnexion: undefined,
    }));

    const email = emailLoginEmail.trim();
    const errors: FieldErrors = {};
    if (!EMAIL_RE.test(email)) errors.emailConnexion = MESSAGES.emailConnexionInvalide;
    if (!emailLoginPassword) {
      errors.motDePasseEmailConnexion = MESSAGES.motDePasseEmailConnexionVide;
    }

    setFieldErrors((current) => ({ ...current, ...errors }));
    if (Object.keys(errors).length > 0) return;

    setEmailLoginPending(true);

    const { error } = await signInWithEmailPassword({
      email,
      password: emailLoginPassword,
    });

    if (error) {
      setEmailLoginNotice(error);
      setEmailLoginPending(false);
      return;
    }

    const role = await getOwnRole();
    window.location.assign(safeNext(searchParams.get("suite")) ?? homeForRole(role));
  }

  /** Adaptateur `onSubmit` : le bloc e-mail est un vrai formulaire. */
  function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleEmailLogin();
  }

  async function handleReset() {
    setRecoveryNotice(null);
    setFieldErrors((current) => ({ ...current, emailRecuperation: undefined }));

    if (!EMAIL_RE.test(recoveryEmail.trim())) {
      setFieldErrors((current) => ({
        ...current,
        emailRecuperation: MESSAGES.emailRecuperationInvalide,
      }));
      return;
    }

    setResetPending(true);

    const { error } = await requestPasswordReset(recoveryEmail.trim());

    setResetPending(false);
    if (error) {
      setRecoveryNotice(error);
      return;
    }

    // Message volontairement identique que le compte existe ou non : sinon la
    // page permettrait de découvrir quelles adresses sont enregistrées.
    setRecoveryNotice(MESSAGES.confirmationEnvoyee);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground sm:p-8">
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-5">
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
            autoComplete="current-password"
            label="Mot de passe"
            value={password}
            onValueChange={setPassword}
            error={fieldErrors.motDePasse}
            required
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setRecoveryOpen((open) => !open);
              setRecoveryNotice(null);
            }}
            aria-expanded={recoveryOpen}
            aria-controls="recuperation-mot-de-passe"
            className="text-sm font-semibold text-brand-text underline-offset-4 hover:underline"
          >
            Mot de passe oublié ?
          </button>
        </div>

        {recoveryOpen ? (
          <div
            id="recuperation-mot-de-passe"
            className="mt-4 rounded-lg border border-border bg-muted p-4"
          >
            <p className="text-sm font-medium text-foreground">
              Pour réinitialiser votre mot de passe, contactez KAS Immo.
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Votre compte est associé à votre numéro de téléphone, pas à une
              adresse e-mail. La réinitialisation par SMS n&apos;est pas
              disponible : aucun code ne peut vous être envoyé. Nos équipes
              peuvent le faire pour vous, appelez le{" "}
              <a
                href={immobilierContact.fixedLine.href}
                className="font-semibold text-brand-text underline-offset-4 hover:underline"
              >
                {immobilierContact.fixedLine.display}
              </a>
              .
            </p>

            {/* Les comptes créés avant le passage au téléphone sont liés à une
                adresse e-mail : ce chemin reste utile pour eux, et il est le
                seul gratuit. Le libellé est distinct de celui du bloc de
                connexion e-mail plus bas — deux résumés identiques sur la même
                page désorientent : celui-ci porte sur la réinitialisation. */}
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold text-brand-text underline-offset-4 hover:underline">
                J&apos;ai créé mon compte avant l&apos;usage du téléphone
              </summary>
              {/* Ce bloc est un `div` et non un `form` : il est imbriqué dans le
                  formulaire de connexion, or deux `form` ne peuvent pas être
                  empilés. Le parseur HTML du rendu serveur refermerait alors le
                  formulaire externe sur cette balise et l'hydratation React
                  divergerait. L'envoi passe donc par le bouton, et la touche
                  Entrée est traitée à la main. */}
              <div
                className="mt-3"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleReset();
                  }
                }}
              >
                <FloatingField
                  id="email-recuperation"
                  name="recoveryEmail"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  label="Adresse e-mail du compte"
                  value={recoveryEmail}
                  onValueChange={setRecoveryEmail}
                  error={fieldErrors.emailRecuperation}
                />
                <Button
                  type="button"
                  onClick={() => void handleReset()}
                  variant="outline"
                  disabled={resetPending}
                  aria-busy={resetPending}
                  className="mt-3 h-12 w-full"
                >
                  {resetPending ? "Envoi…" : "Recevoir le lien par e-mail"}
                </Button>
              </div>
            </details>

            {recoveryNotice ? (
              <motion.p
                role="status"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DURATION.fast, ease: EASE_PRO }}
                className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground"
              >
                {recoveryNotice}
              </motion.p>
            ) : null}
          </div>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending}
          className="mt-6 h-12 w-full text-base"
        >
          {pending ? "Connexion…" : "Se connecter"}
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

      {/* Comptes créés avant le passage au numéro : ils ne sont ni convertis ni
          supprimés, et leur identifiant reste l'adresse e-mail. Ce bloc est
          placé APRÈS `</form>` et non à l'intérieur : il peut ainsi être un
          vrai formulaire, sans imbrication ni bouton à déclencher à la main. */}
      <details className="mt-6 rounded-lg border border-border bg-muted p-4">
        <summary className="cursor-pointer text-sm font-semibold text-brand-text underline-offset-4 hover:underline">
          Mon compte utilise une adresse e-mail
        </summary>

        <form onSubmit={handleEmailSubmit} noValidate className="mt-4 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Réservé aux comptes créés avant le numéro de téléphone. Les nouveaux
            comptes s&apos-inscrivent avec un numéro.
          </p>

          <FloatingField
            id="email-connexion"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            label="Adresse e-mail du compte"
            value={emailLoginEmail}
            onValueChange={setEmailLoginEmail}
            error={fieldErrors.emailConnexion}
            required
          />
          <FloatingField
            id="mot-de-passe-email"
            name="emailPassword"
            type="password"
            autoComplete="current-password"
            label="Mot de passe"
            value={emailLoginPassword}
            onValueChange={setEmailLoginPassword}
            error={fieldErrors.motDePasseEmailConnexion}
            required
          />

          {emailLoginNotice ? (
            <motion.p
              role="alert"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION.fast, ease: EASE_PRO }}
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
            >
              {emailLoginNotice}
            </motion.p>
          ) : null}

          <Button
            type="submit"
            variant="outline"
            disabled={emailLoginPending}
            aria-busy={emailLoginPending}
            className="h-12 w-full"
          >
            {emailLoginPending ? "Connexion…" : "Se connecter avec mon e-mail"}
          </Button>
        </form>
      </details>

      {/* Google reste proposé, mais explicitement en second : le téléphone est
          le parcours principal, et le seul qui n'a pas de coût. */}
      <div className="mt-6 flex items-center gap-3" aria-hidden="true">
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
        Pas encore de compte ?{" "}
        <Link
          href="/inscription"
          className="font-semibold text-brand-text underline-offset-4 hover:underline"
        >
          S&apos;inscrire
        </Link>
      </p>
    </div>
  );
}
