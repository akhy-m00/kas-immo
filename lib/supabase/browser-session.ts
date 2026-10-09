"use client";

import { estEmailTechniqueInterne } from "@/lib/phone";

import { createClient } from "./client";
import type { UserRole } from "./database.types";

/**
 * Lit la session courante dans le navigateur : nom affiché et rôle.
 *
 * Renvoie `null` si personne n'est connecté.
 *
 * Distinct de `getOwnRole`, qui ne renvoie que le rôle : le header a besoin du
 * nom pour l'afficher dans le bouton, les deux informations sont donc lues
 * ensemble en un seul aller-retour.
 */
export async function getClientSession(): Promise<{
  fullName: string;
  role: UserRole;
} | null> {
  const supabase = createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  // La RLS n'autorise chaque utilisateur que la lecture de son propre profil.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", claims.sub)
    .maybeSingle();

  const email = emailReel(claims.email);

  return {
    fullName: profile?.full_name || fallbackName(email),
    role: profile?.role ?? "client",
  };
}

/**
 * Ne garde que l'adresse e-mail réellement fournie par l'utilisateur.
 *
 * Un compte créé avec un numéro est enregistré sous une adresse technique
 * interne (`771234567@compte.invalid`) : la laisser passer produirait un nom
 * affiché « 771234567 », qui est le numéro utilisé en interne, pas une identité.
 * Elle est donc neutralisée ici. `.invalid` étant un domaine réservé, aucun
 * e-mail légitime n'est perdu.
 */
function emailReel(email: unknown): string {
  if (typeof email !== "string") return "";
  return estEmailTechniqueInterne(email) ? "" : email;
}

/**
 * Remplace un nom absent par la partie du champ e-mail avant le `@`.
 *
 * Reçoit une adresse déjà filtrée par `emailReel()` : pour un compte téléphone
 * il reste `""`, et le résultat est « Client ».
 */
function fallbackName(email: string): string {
  if (!email.includes("@")) return "Client";
  return email.split("@")[0] || "Client";
}

/**
 * Nom et téléphone du profil, pour PRÉREMPLIR le formulaire de demande de
 * visite.
 *
 * Séparé de `getClientSession` volontairement : celui-ci ne sert qu'à afficher
 * un nom et un rôle dans le header, et il reste donc minimal. Le formulaire de
 * visite, lui, a besoin du téléphone — et uniquement du téléphone : l'adresse
 * e-mail du demandeur n'est pas une information de la demande, c'est celle de
 * son compte, gérée par Supabase Auth. Elle n'est donc nicopiée dans
 * `requests`, ni redemandée.
 *
 * Ce n'est qu'un CONFORT : les champs restent modifiables et sont validés côté
 * serveur comme une saisie manuelle. Préremplir ne donne aucun droit.
 */
export async function getProfileContact(): Promise<{
  fullName: string;
  phone: string;
} | null> {
  const supabase = createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", claims.sub)
    .maybeSingle();

  const email = emailReel(claims.email);

  return {
    fullName: profile?.full_name || fallbackName(email),
    phone: profile?.phone ?? "",
  };
}