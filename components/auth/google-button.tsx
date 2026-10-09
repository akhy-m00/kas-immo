"use client";

import { useState } from "react";
import { motion } from "motion/react";

import { GoogleLogo } from "@/components/auth/google-logo";
import { Button } from "@/components/ui/button";
import { DURATION, EASE_PRO } from "@/lib/animations";
import { signInWithGoogle } from "@/lib/supabase/auth-client";

/**
 * Bouton « Continuer avec Google ».
 *
 * `type="button"` : il ne doit jamais déclencher la soumission du formulaire
 * de connexion qui l'accompagne, sinon un clic sur Google tenterait d'abord
 * une connexion par mot de passe.
 */
export function GoogleButton({ className }: { className?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);

    const { error: signInError } = await signInWithGoogle();

    if (signInError) {
      setError(signInError);
      setPending(false);
      return;
    }

    // Pas de redirection manuelle : `signInWithOAuth` quitte la page pour
    // Google, puis le navigateur revient sur /auth/callback. Leaving
    // `pending` à `true` évite un clignotement du libellé pendant ce vol.
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={pending}
        aria-busy={pending}
        className="h-12 w-full gap-3 text-base"
      >
        <GoogleLogo className="size-5 shrink-0" />
        {pending ? "Redirection vers Google…" : "Continuer avec Google"}
      </Button>

      {error ? (
        <motion.p
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.fast, ease: EASE_PRO }}
          className="mt-3 text-sm font-medium text-destructive"
        >
          {error}
        </motion.p>
      ) : null}
    </div>
  );
}
