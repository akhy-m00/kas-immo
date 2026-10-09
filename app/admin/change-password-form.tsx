"use client";

import { useActionState, useState } from "react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { FloatingField } from "@/components/motion/FloatingField";
import { DURATION, EASE_PRO } from "@/lib/animations";
import { cn } from "@/lib/utils";

import { changePassword, type ChangePasswordState } from "./actions";

const LONGUEUR_MDP_MIN = 8;

const STATE_INITIAL: ChangePasswordState = {
  error: null,
  success: false,
  fieldErrors: {},
};

/**
 * Formulaire « Modifier mon mot de passe » du tableau de bord admin.
 *
 * L'état est piloté par `useActionState` : aucune requête HTTP naïve, le
 * formulaire fonctionne même si le JavaScript du navigateur échoue, et
 * `pending` évite les doubles soumissions. Les champs redeviennent « flottants »
 * dès qu'une valeur est saisie (même comportement que les formulaires publics
 * via `FloatingField`), et le mot de passe est vidé du DOM une fois modifié.
 */
export function ChangePasswordForm() {
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const [state, formAction, pending] = useActionState(
    changePassword,
    STATE_INITIAL,
  );

  // Une fois le mot de passe modifié, les champs sont vidés : ne pas laisser
  // le mot de passe vivre dans le DOM. Ajustement pendant le rendu (pattern
  // React « ajuster l'état quand une donnée change »), sans effet : un effet
  // provoquerait un rendu en cascade juste après le rendu déclenché par l'état.
  const [succesPrecedent, setSuccesPrecedent] = useState(false);
  if (state?.success && !succesPrecedent) {
    setSuccesPrecedent(true);
    setMotDePasse("");
    setConfirmation("");
  } else if (!state?.success && succesPrecedent) {
    setSuccesPrecedent(false);
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <FloatingField
        id="nouveau-mot-de-passe"
        name="motDePasse"
        type="password"
        autoComplete="new-password"
        label="Nouveau mot de passe"
        value={motDePasse}
        onValueChange={setMotDePasse}
        error={state?.fieldErrors.motDePasse}
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
        error={state?.fieldErrors.confirmation}
        required
      />

      <Button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="h-12 w-full text-base"
      >
        {pending ? "Enregistrement…" : "Modifier mon mot de passe"}
      </Button>

      {state?.error ? (
        <motion.p
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.fast, ease: EASE_PRO }}
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {state.error}
        </motion.p>
      ) : null}

      {state?.success ? (
        <motion.p
          role="status"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.fast, ease: EASE_PRO }}
          className={cn(
            "rounded-lg border px-4 py-3 text-sm font-medium",
            "border-border bg-muted text-foreground",
          )}
        >
          Mot de passe modifié. Il vous sera demandé à la prochaine connexion.
        </motion.p>
      ) : null}
    </form>
  );
}