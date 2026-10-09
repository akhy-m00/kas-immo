"use client";

import type { AuthError } from "@supabase/supabase-js";

import {
  MESSAGE_TELEPHONE_INVALIDE,
  emailInterneDepuisTelephone,
  estEmailTechniqueInterne,
  normaliserTelephoneSenegalais,
} from "@/lib/phone";

import { createClient } from "./client";
import type { UserRole } from "./database.types";

/**
 * Remplace toute adresse technique interne par une formulation neutre.
 *
 * Supabase n'échoie normalement pas l'identifiant dans ses messages, mais rien
 * ne l'interdit : une erreur future pourrait le contenir, et l'utilisateur
 * verrait alors `771234567@compte.invalid` — une adresse qui n'est pas la
 * sienne et qu'il ne peut pas utiliser. Plutôt que de faire confiance à chaque
 * message, la substitution est appliquée en sortie de `authErrorMessage()`, donc
 * sur tous les chemins sans exception.
 *
 * Le motif est borné au domaine interne : un vrai e-mail cité dans un message
 * resterait visible, ce qui est sans importance et évite de masquer
 * l'information utile.
 */
function neutraliserAdresseInterne(message: string): string {
  return message.replace(
    /[^\s@]+@compte\.invalid/gi,
    "votre numéro de téléphone",
  );
}

/**
 * Traduit les erreurs renvoyées par Supabase en messages compréhensibles.
 *
 * Supabase répond en anglais, et masque volontairement la raison d'un échec de
 * connexion : « Invalid login credentials » couvre à la fois un numéro
 * inexistant et un mot de passe faux, ce qui est une bonne pratique
 * (elle ne révèle pas quels numéros ont un compte). On ne fait donc pas
 * mieux que l'utilisateur en amont, on ne fait que traduire.
 *
 * Les comptes créés avec un numéro sont enregistrés sous une adresse technique
 * interne (voir `emailInterneDepuisTelephone`), jamais sous une vraie adresse :
 * les messages parlent donc de « numéro de téléphone », et l'identifiant réel
 * ne doit jamais atteindre l'écran — voir `authErrorMessage()`.
 */
function traduireErreurAuth(
  error: AuthError | null,
  context:
    | "connexion"
    | "connexionEmail"
    | "inscription"
    | "google"
    | "reinitialisation" = "connexion",
): string | null {
  if (!error) return null;

  const message = error.message.toLowerCase();

  // Erreurs de validation gérées en amont par le formulaire : si elles
  // remontent malgré tout, elles sont dues à une règle serveur plus stricte.
  if (message.includes("at least")) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }

  switch (true) {
    // Le message nomme l'identifiant réellement saisi : annoncer un « numéro de
    // téléphone » dans un formulaire e-mail ferait perdre l'utilisateur.
    case message.includes("invalid login credentials"):
      return context === "connexionEmail"
        ? "E-mail ou mot de passe incorrect."
        : "Numéro de téléphone ou mot de passe incorrect.";

    case message.includes("email not confirmed"):
      // Un compte téléphone n'a pas d'adresse e-mail : annoncer une confirmation
      // d'e-mail serait incompréhensible, et proposer « vérifiez votre boîte de
      // réception » pointerait vers une boîte qui n'existe pas. Ce cas
      // n'apparaît que si la confirmation des e-mails est restée activée dans
      // les réglages du projet — voir le README.
      return context === "connexionEmail"
        ? "Votre adresse e-mail n'est pas encore confirmée. Vérifiez votre boîte de réception."
        : "Votre compte n'a pas pu être activé. Contactez KAS Immo pour le finaliser.";

    case message.includes("user already registered") ||
      message.includes("already been registered"):
      return "Un compte existe déjà avec ce numéro de téléphone. Essayez de vous connecter.";

    case message.includes("email rate limit") ||
      message.includes("too many requests"):
      return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";

    case message.includes("failed to fetch") ||
      message.includes("network") ||
      message.includes("fetch"):
      return "Impossible de joindre le serveur. Vérifiez votre connexion internet.";

    case message.includes("password should be at least"):
      return "Le mot de passe doit contenir au moins 8 caractères.";

    // Supabase valide le format de l'identifiant qu'il reçoit. Si la
    // normalisation laissait passer un numéro douteux, ou si l'adresse
    // technique dérivée était refusée, le dire en termes d'e-mail perdrait
    // l'utilisateur : un compte téléphone n'a pas d'adresse.
    case message.includes("unable to validate email") ||
      message.includes("unable to validate phone") ||
      message.includes("invalid phone") ||
      message.includes("phone number"):
      return context === "connexionEmail"
        ? "Cette adresse e-mail n'est pas valide."
        : "Saisissez un numéro de téléphone valide, par exemple 77 123 45 67.";

    case message.includes("over_request_rate_limit") ||
      message.includes("over_email_send_rate_limit"):
      return "Trop d'e-mails envoyés. Patientez avant de réessayer.";

    case message.includes("provider is not enabled") ||
      message.includes("unsupported provider"):
      return "La connexion avec Google n'est pas encore activée sur ce projet.";

    // Le Phone Auth de Supabase n'est plus utilisé : il exigerait un
    // fournisseur SMS payant. Son ancien code d'erreur (`otp_disabled`) ne peut
    // donc plus survenir, et aucun message ne promet ici une vérification SMS.

    default:
      break;
  }

  // `context` permet de proposer une action utile plutôt qu'une excuse.
  switch (context) {
    case "inscription":
      return "L'inscription n'a pas abouti. Vérifiez vos informations et réessayez.";
    case "google":
      return "La connexion avec Google a échoué. Réessayez, ou utilisez votre numéro et votre mot de passe.";
    case "reinitialisation":
      return "L'envoi de l'e-mail a échoué. Réessayez dans quelques instants.";
    default:
      return "Connexion impossible. Vérifiez votre numéro de téléphone et votre mot de passe.";
  }
}

/**
 * Point d'entrée unique pour traduire une erreur d'authentification.
 *
 * Toute traduction passe par ici, ce qui rend impossible l'affichage d'une
 * adresse technique interne : un cas ajouté plus bas dans
 * `traduireErreurAuth()` ne peut pas l'échapper.
 */
export function authErrorMessage(
  error: AuthError | null,
  context:
    | "connexion"
    | "connexionEmail"
    | "inscription"
    | "google"
    | "reinitialisation" = "connexion",
): string | null {
  const message = traduireErreurAuth(error, context);
  return message ? neutraliserAdresseInterne(message) : null;
}

/** Résultat commun à toutes les actions, pour ne jamais lever côté client. */
export type AuthResult = { error: string | null };

/**
 * Inscription par numéro de téléphone et mot de passe.
 *
 * Le téléphone est normalisé en E.164 puis converti en adresse technique
 * déterministe (`emailInterneDepuisTelephone`), et c'est cette adresse qui est
 * transmise à Supabase Auth. `emailInterne` reste une variable locale : elle
 * n'est ni retournée, ni loguée, ni affichée.
 *
 * Pourquoi ne pas utiliser le Phone Auth de Supabase : le fournisseur « Phone »
 * est indissociable d'un fournisseur SMS payant, alors qu'un mot de passe n'a
 * besoin d'aucun envoi. Supabase n'offre donc pas d'identifiant téléphone
 * gratuit — un e-mail technique, jamais affiché ni stocké, tient exactement le
 * même rôle d'identifiant unique.
 *
 * Conséquence utile : l'unicité du numéro vient de l'unicité de l'adresse, qui
 * en est dérivée. Aucun index supplémentaire en base, et deux personnes ne
 * peuvent pas s'inscrire avec le même numéro.
 *
 * `options.data` est indispensable : le déclencheur `handle_new_user` remplit
 * `profiles` depuis `raw_user_meta_data`, pas depuis l'adresse technique. Sans
 * `full_name` et `phone` dans ces métadonnées, `profiles.phone` resterait
 * NULL — donc absent des demandes de visite — et la connexion par numéro
 * deviendrait impossible. `phone` y reçoit le numéro NORMALISÉ, jamais l'adresse.
 *
 * Aucun SMS ni OTP : `channel` n'est pas renseigné, et le seul e-mail possible
 * viserait `@compte.invalid`, que le projet n'envoie pas (confirmation des
 * e-mails désactivée — voir README).
 */
export async function signUp(params: {
  phone: string;
  password: string;
  fullName: string;
}): Promise<AuthResult> {
  const normalizedPhone = normaliserTelephoneSenegalais(params.phone);
  if (!normalizedPhone) return { error: MESSAGE_TELEPHONE_INVALIDE };

  const emailInterne = emailInterneDepuisTelephone(normalizedPhone);

  // Le formulaire valide déjà ces deux points ; on ne se fie donc pas à son
  // seul résultat. Dériver l'identifiant d'une saisie arbitraire reviendrait à
  // contourner la normalisation.
  if (!emailInterne) {
    return { error: MESSAGE_TELEPHONE_INVALIDE };
  }

  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email: emailInterne,
    password: params.password,
    options: {
      data: { full_name: params.fullName, phone: normalizedPhone },
    },
  });

  if (error) {
    return { error: authErrorMessage(error, "inscription") };
  }

  // Un compte créé sans e-mail n'a rien à confirmer, donc une session doit
  // exister. S'il n'y en a pas, c'est que la session n'a pas pu être ouverte :
  // on ne renvoie pas vers un espace client qui refuserait l'accès, et on ne
  // dit pas « connectez-vous » alors qu'une seconde tentative échouerait
  // elle aussi — c'est le cas tant que la confirmation des e-mails est exigée
  // dans les réglages du projet.
  if (!data.session) {
    return {
      error:
        "Votre compte a été créé, mais la connexion n'a pas abouti. Contactez l'agence pour finaliser votre inscription.",
    };
  }

  return { error: null };
}

/**
 * Connexion par numéro de téléphone et mot de passe.
 *
 * Le numéro est normalisé puis reconverti en adresse technique : la fonction
 * est déterministe, donc inscription et connexion reconstruisent toujours la
 * même adresse, sans rien avoir à stocker.
 */
export async function signInWithPassword(params: {
  phone: string;
  password: string;
}): Promise<AuthResult> {
  const emailInterne = emailInterneDepuisTelephone(params.phone);
  if (!emailInterne) return { error: MESSAGE_TELEPHONE_INVALIDE };

  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: emailInterne,
    password: params.password,
  });

  return { error: authErrorMessage(error, "connexion") };
}

/**
 * Connexion par adresse e-mail et mot de passe.
 *
 * Réservé aux comptes créés avant le passage au numéro : le parcours principal
 * est désormais le téléphone, mais ces comptes ne sont ni convertis ni supprimés.
 * L'identifiant n'est pas normalisé : une adresse n'a pas d'équivalent E.164, et
 * `supabase.auth` la transmet telle quelle.
 */
export async function signInWithEmailPassword(params: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });

  return { error: authErrorMessage(error, "connexionEmail") };
}

/**
 * Lance la connexion OAuth Google.
 *
 * `redirectTo` doit figurer dans la liste « Redirect URLs » du tableau de
 * bord Supabase. Le navigateur quitte le site pour Google puis revient sur
 * `/auth/callback`, qui échange le code contre une session.
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return { error: authErrorMessage(error, "google") };
}

/** Déconnexion. `scope: "local"` évite d'invalider les sessions d'autres appareils. */
export async function signOut(): Promise<AuthResult> {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) return { error: "La déconnexion a échoué. Réessayez." };

  return { error: null };
}

/**
 * Demande l'e-mail de réinitialisation du mot de passe.
 *
 * ⚠️ Par E-MAIL uniquement. La version téléphone de cette récupération
 * (`resetPasswordForOtp`) passe par un SMS, donc par un fournisseur payant :
 * elle n'est volontairement pas proposée. Les comptes créés avec un numéro
 * n'ont d'ailleurs pas d'adresse, ils recurrent à l'assistance de l'agence ;
 * les comptes e-mail conservent ce chemin.
 *
 * Un compte téléphone ne doit donc JAMAIS atteindre cet appel : l'adresse
 * technique serait rejetée par le serveur SMTP, et surtout cela ferait tenter
 * un envoi vers une adresse qui n'appartient à personne. Le garde-fou est ici,
 * au plus près de l'appel réseau, plutôt que dans le formulaire — un appelant
 * futur qui passerait une valeur calculée serait bloqué aussi.
 */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  if (estEmailTechniqueInterne(email)) {
    return {
      error:
        "Pour réinitialiser votre mot de passe, contactez KAS Immo. Ce compte est associé à un numéro de téléphone, pas à une adresse e-mail.",
    };
  }

  const supabase = createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?suite=/reinitialiser-mot-de-passe`,
  });

  return { error: authErrorMessage(error, "reinitialisation") };
}

/**
 * Définit un nouveau mot de passe.
 *
 * À appeler depuis la page ouverte par le lien de réinitialisation, une fois
 * que le callback a échangé le code contre une session.
 */
export async function updatePassword(password: string): Promise<AuthResult> {
  const supabase = createClient();

  const { error } = await supabase.auth.updateUser({ password });

  return { error: authErrorMessage(error, "reinitialisation") };
}

/** Lit le rôle de l'utilisateur connecté via la RLS de `profiles`. */
export async function getOwnRole(): Promise<UserRole> {
  const supabase = createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return "client";

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return data?.role ?? "client";
}
