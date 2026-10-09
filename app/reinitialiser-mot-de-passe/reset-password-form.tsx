"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { motion } from "motion/react";

import { FloatingField } from "@/components/motion/FloatingField";
import { Button } from "@/components/ui/button";
import { DURATION, EASE_PRO } from "@/lib/animations";
import { getOwnRole, updatePassword } from "@/lib/supabase/auth-client";
import { homeForRole } from "@/lib/supabase/routes";

type FieldErrors = Partial<Record<"motDePasse" | "confirmation", string>>;

const LONGUEUR_MDP_MIN = 8;

const MESSAGES = {
  motDePasseCourt: `Le mot de passe doit contenir au moins ${LONGUEUR_MDP_MIN} caractères.`,
  motDePasseVide: "Saisissez un nouveau mot de passe.",
  confirmationVide: "Saisissez à nouveau votre mot de passe.",
  confirmationDifferente: "Les deux mots de passe ne correspondent pas.",
  succes: "Mot de passe mis à jour. Redirection…",
} as const;

/**
 * Choix du nouveau mot de passe.
 *
 * Cette page n'est atteignable qu'après le passage par `/auth/callback`, qui a
 * échangé le code du lien e-mail contre une session. Ouvrir l'URL directement
 * ne fonctionne donc pas, ce qui est le comportement attendu d'un lien de
 * réinitialisation.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors: FieldErrors = {};

    if (!password) {
      errors.motDePasse = MESSAGES.motDePasseVide;
    } else if (password.length < LONGUEUR_MDP_MIN) {
      errors.motDePasse = MESSAGES.motDePasseCourt;
    }

    if (!confirmation) {
      errors.confirmation = MESSAGES.confirmationVide;
    } else if (confirmation !== password) {
      errors.confirmation = MESSAGES.confirmationDifferente;
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPending(true);

    const { error } = await updatePassword(password);

    if (error) {
      setFormError(error);
      setPending(false);
      return;
    }

    const role = await getOwnRole();
    router.replace(homeForRole(role));
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground sm:p-8">
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-5">
          <FloatingField
            id="nouveau-mot-de-passe"
            name="password"
            type="password"
            autoComplete="new-password"
            label="Nouveau mot de passe"
            value={password}
            onValueChange={setPassword}
            error={fieldErrors.motDePasse}
            minLength={LONGUEUR_MDP_MIN}
            required
          />
          <FloatingField
            id="confirmation-mot-de-passe"
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
          {pending ? "Enregistrement…" : "Mettre à jour mon mot de passe"}
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
    </div>
  );
}
