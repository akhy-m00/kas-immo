"use server";

import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Écritures du compte administrateur depuis le tableau de bord.
 *
 * ⚠️ `app/admin/layout.tsx` protège les PAGES, pas les Server Actions : une
 * action est une route HTTP publique, atteignable sans passer par un rendu de
 * page. Cette fonction rappelle donc `requireAdmin()` avant toute écriture,
 * comme les actions des sections `biens`, `cleaning` et `demandes`.
 *
 * Le mot de passe n'est jamais stocké par ce module : il est transmis à
 * Supabase Auth, qui n'en conserve qu'un hash, et il ne doit jamais être écrit
 * dans un journal, ni renvoyé dans l'état du formulaire.
 */

const LONGUEUR_MDP_MIN = 8;

export type PasswordFieldErrors = {
  motDePasse?: string;
  confirmation?: string;
};

/** État renvoyé au formulaire de changement de mot de passe. */
export type ChangePasswordState = {
  error: string | null;
  success: boolean;
  fieldErrors: PasswordFieldErrors;
};

/** Traduit une erreur de `updateUser` sans jamais y recopier de valeur. */
function traduireErreurMotDePasse(error: { message?: string } | null): string {
  if (!error) {
    return "Le mot de passe n'a pas pu être modifié. Réessayez.";
  }

  const message = (error.message ?? "").toLowerCase();

  if (message.includes("at least") || message.includes("password should be")) {
    return `Le mot de passe doit contenir au moins ${LONGUEUR_MDP_MIN} caractères.`;
  }

  if (message.includes("too many requests") || message.includes("rate limit")) {
    return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
  }

  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Impossible de joindre le serveur. Vérifiez votre connexion internet.";
  }

  return "Le mot de passe n'a pas pu être modifié. Réessayez.";
}

/**
 * Change le mot de passe de l'administrateur connecté.
 *
 * Validation dédoublée avec le formulaire : une action est atteignable sans
 * passer par le navigateur, on ne se fie donc pas à la seule validation
 * client.
 */
export async function changePassword(
  _previous: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  await requireAdmin();

  const brutMdp = formData.get("motDePasse");
  const brutConfirmation = formData.get("confirmation");

  const motDePasse = typeof brutMdp === "string" ? brutMdp : "";
  const confirmation = typeof brutConfirmation === "string" ? brutConfirmation : "";

  const fieldErrors: PasswordFieldErrors = {};

  if (motDePasse.length === 0) {
    fieldErrors.motDePasse = "Saisissez votre nouveau mot de passe.";
  } else if (motDePasse.length < LONGUEUR_MDP_MIN) {
    fieldErrors.motDePasse = `Le mot de passe doit contenir au moins ${LONGUEUR_MDP_MIN} caractères.`;
  }

  if (confirmation.length === 0) {
    fieldErrors.confirmation = "Confirmez votre nouveau mot de passe.";
  } else if (confirmation !== motDePasse) {
    fieldErrors.confirmation = "Les deux mots de passe ne correspondent pas.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: null, success: false, fieldErrors };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password: motDePasse });

  if (error) {
    return {
      error: traduireErreurMotDePasse(error),
      success: false,
      fieldErrors: {},
    };
  }

  // La session reste valide après `updateUser` : l'administrateur continue sur
  // le tableau de bord, et la prochaine connexion exigera le nouveau mot de
  // passe.
  return { error: null, success: true, fieldErrors: {} };
}