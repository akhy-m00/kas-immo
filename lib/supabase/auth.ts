import { redirect } from "next/navigation";

import { estEmailTechniqueInterne } from "@/lib/phone";

import type { UserRole } from "./database.types";
import { createClient } from "./server";

/** Utilisateur connecté, avec son rôle lu en base. */
export type CurrentUser = {
  id: string;
  /**
   * Adresse e-mail RÉELLE de l'utilisateur, ou `""` s'il n'en a pas.
   *
   * Les comptes créés avec un numéro sont enregistrés sous une adresse technique
   * interne (`771234567@compte.invalid`) : la transmettre ici exposerait une
   * adresse que l'utilisateur n'a pas choisie et ne peut pas utiliser. Elle est
   * donc filtrée, et `""` signale « aucun e-mail » — voir `emailReel()`.
   */
  email: string;
  /** Nom complet, ou à défaut la partie du champ email avant le `@`. */
  fullName: string;
  phone: string | null;
  role: UserRole;
};

/**
 * Retourne l'utilisateur connecté et son rôle, ou `null` si personne n'est
 * connecté.
 *
 * ⚠️ `getClaims()` et non `getSession()` : `getSession()` se contente de lire
 * le cookie sans le revalider. Comme le cookie est contrôlé par le client,
 * n'importe qui peut le forger, ce qui suffirait à se faire passer pour un
 * admin. `getClaims()` vérifie la signature du jeton à chaque appel.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims?.sub) return null;

  const id = claims.sub;
  const email = emailReel(claims.email);

  // La RLS n'autorise chaque utilisateur que la lecture de son propre profil.
  // `.maybeSingle()` plutôt que `.single()` : un compte créé avant
  // l'installation du déclencheur n'aurait pas de profil, et cela ne doit pas
  // faire échouer toute la page.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, role")
    .eq("id", id)
    .maybeSingle();

  return {
    id,
    email,
    fullName: profile?.full_name || fallbackName(email),
    // `profiles.phone` est la source normale : le déclencheur le remplit à
    // l'inscription. `claims.phone` n'est qu'un repli, pour un compte dont la
    // ligne de profil aurait été créée sans métadonnées. Google ne fournit ni
    // l'un ni l'autre, d'où le `null` affiché plus bas comme un champ absent.
    phone:
      profile?.phone ??
      (typeof claims.phone === "string" ? claims.phone : null),
    role: profile?.role ?? "client",
  };
}

/**
 * Ne garde que l'adresse e-mail réellement fournie par l'utilisateur.
 *
 * Supabase Auth conserve dans le jeton l'adresse utilisée pour créer le compte.
 * Pour un compte créé avec un numéro, il s'agit de l'adresse technique interne,
 * que l'utilisateur ignore. Elle est donc remplacée par `""` — un compte
 * téléphone est reconnu à l'absence d'e-mail, pas à une adresse fantôme.
 *
 * `.invalid` étant un domaine réservé, cette adresse ne peut appartenir à aucun
 * vrai client : aucun e-mail légitime n'est écrasé par erreur.
 */
function emailReel(email: unknown): string {
  if (typeof email !== "string") return "";
  return estEmailTechniqueInterne(email) ? "" : email;
}

/**
 * Remplace un nom absent par la partie de l'email avant le `@`.
 *
 * Reçoit une adresse déjà filtrée par `emailReel()` : pour un compte téléphone
 * il reste `""`, et le résultat est « Client » — afficher `771234567` comme nom
 * trahirait le numéro technique utilisé en interne.
 */
function fallbackName(email: string): string {
  if (!email.includes("@")) return "Client";
  return email.split("@")[0] || "Client";
}

/**
 * Garde de page : exige une session, sinon renvoie vers la connexion.
 *
 * À appeler au début d'un Server Component de page protégée.
 */
export async function requireUser(returnTo?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    const target = returnTo ? `?suite=${encodeURIComponent(returnTo)}` : "";
    redirect(`/connexion${target}`);
  }

  return user;
}

/**
 * Garde de page : exige le rôle `admin`.
 *
 * Un visiteur non connecté est renvoyé vers la connexion. Un utilisateur
 * connecté mais simple client est renvoyé vers son espace client, avec un
 * message d'accès refusé porté par `?erreur=` : le renvoyer vers la connexion
 * lui ferait croire à une session expirée alors que sa session est valide. Dans
 * les deux cas la page protégée n'est jamais rendue.
 *
 * La redirection vise `/mon-compte` et non l'accueil parce que l'accueil est
 * prérendu : lire un paramètre d'URL pour y afficher un message le rendrait
 * dynamique et coûterait le temps de réponse mesuré sur la page d'accueil.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser("/admin");

  if (user.role !== "admin") {
    redirect("/mon-compte?erreur=acces-restreint");
  }

  return user;
}
