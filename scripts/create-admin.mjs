/**
 * Création du compte administrateur unique KAS Immo.
 *
 * Fonctionne par paires pour l'application : l'administrateur se connecte avec
 * son numéro de téléphone (773407070) et son mot de passe. Supabase Auth ne
 * connait que l'identifiant technique interne (ex. 773407070@compte.invalid)
 * tramé par `lib/phone.ts` — c'est ce compte qu'on crée ici, puis on lui pose
 * le rôle `admin` dans `profiles` via le rôle service (qui contourne la RLS).
 *
 * Sécurité du mot de passe :
 *   - il est demandé UNIQUEMENT par la variable d'environnement
 *     `ADMIN_INITIAL_PASSWORD`, passée au moment de l'exécution et jamais
 *     écrite dans un fichier ni versionnée,
 *   - ce script ne l'affiche jamais, ne le journalise pas et ne le renvoie par
 *     aucune API,
 *   - à l'issue, le mot de passe n'existe que par le hash côté Supabase Auth.
 *
 * Prudence d'exécution : en l'absence de `--apply`, le script ne fait que des
 * LECTURES (recherche d'un compte déjà existant) ; la création effective n'a
 * lieu qu'avec `--apply`. Si un compte existe déjà pour ce numéro, le script
 * prévient et ne modifie rien.
 *
 * Usage :
 *   ADMIN_INITIAL_PASSWORD='…' node scripts/create-admin.mjs           simulation
 *   ADMIN_INITIAL_PASSWORD='…' node scripts/create-admin.mjs --apply   création
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

import {
  emailInterneDepuisTelephone,
  normaliserTelephoneSenegalais,
} from "../lib/phone.ts";

const APPLIQUER = process.argv.includes("--apply");
const RACINE = process.cwd();

const TELEPHONE_SAISI = process.env.ADMIN_PHONE ?? "773407070";
const NOM_AFFICHE = process.env.ADMIN_FULL_NAME ?? "Administrateur KAS";
const MOT_DE_PASSE = process.env.ADMIN_INITIAL_PASSWORD;

const telephone = normaliserTelephoneSenegalais(TELEPHONE_SAISI);
if (!telephone) {
  console.error(`Numéro de téléphone invalide : ${TELEPHONE_SAISI}`);
  process.exit(1);
}

const email = emailInterneDepuisTelephone(telephone);
if (!email) {
  console.error("Impossible de dériver l'identifiant technique du numéro.");
  process.exit(1);
}

// Le mot de passe vient UNIQUEMENT de l'environnement d'exécution (et PAS de
// .env.local, qui pourrait être sauvegardé en clair). Il est obligatoire pour
// la création, facultatif en simulation où il ne serait de toute façon jamais
// affiché.
if (APPLIQUER && !MOT_DE_PASSE) {
  console.error(
    "ADMIN_INITIAL_PASSWORD est requis pour créer le compte :\n" +
      "  ADMIN_INITIAL_PASSWORD='…' node scripts/create-admin.mjs --apply",
  );
  process.exit(1);
}

const env = Object.fromEntries(
  (await fs.readFile(path.join(RACINE, ".env.local"), "utf8"))
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const URL_PROJET = env.NEXT_PUBLIC_SUPABASE_URL;
if (!URL_PROJET || !env.SUPABASE_SECRET_KEY) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY manquants dans .env.local.",
  );
  process.exit(1);
}

const db = createClient(URL_PROJET, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

/** Le compte Auth existe-t-il déjà pour cet identifiant technique ? */
async function trouverCompteExistant() {
  const { data, error } = await db.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) {
    throw new Error(`lecture des comptes : ${error.message}`);
  }
  return (data?.users ?? []).find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
}

async function principal() {
  const existant = await trouverCompteExistant();

  if (existant) {
    const { data: profil, error } = await db
      .from("profiles")
      .select("role")
      .eq("id", existant.id)
      .maybeSingle();
    if (error) {
      throw new Error(`lecture du profil : ${error.message}`);
    }

    console.log(`Un compte existe déjà pour ${telephone} (${email}).`);
    console.log(`  id      : ${existant.id}`);
    console.log(`  rôle    : ${profil?.role ?? "profil absent"}`);

    if (profil?.role === "admin") {
      console.log("Rien à faire : c'est déjà l'administrateur.");
    } else {
      console.log(
        "Ce compte n'a pas le rôle admin : aucune modification, régulariser à la main si besoin.",
      );
    }
    return;
  }

  console.log("Aucun compte existant : création prévue du compte administrateur.");
  console.log(`  téléphone            : ${TELEPHONE_SAISI}`);
  console.log(`  identifiant technique: ${email}`);
  console.log(`  nom affiché          : ${NOM_AFFICHE}`);
  console.log(`  rôle visé            : admin`);
  console.log("  mot de passe         : fourni à l'exécution (jamais affiché)");

  if (!APPLIQUER) {
    console.log();
    console.log("SIMULATION — rien n'a été créé. Relancer avec --apply pour créer.");
    return;
  }

  const { data: cree, error: erreurCreation } = await db.auth.admin.createUser({
    email,
    password: MOT_DE_PASSE,
    email_confirm: true,
    user_metadata: { full_name: NOM_AFFICHE, phone: telephone },
  });

  if (erreurCreation || !cree?.user) {
    console.error(
      "Échec de la création du compte :",
      erreurCreation?.message ?? "réponse vide",
    );
    process.exit(1);
  }

  const id = cree.user.id;

  // Le déclencheur `handle_new_user` crée le profil en `client`. S'il est
  // présent (cas normal) on le promeut ; s'il manque, on le crée en `admin`
  // (défensif). Le dédoublonnage de la migration 0005 protège l'unicité.
  const { data: profilExistant } = await db
    .from("profiles")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (profilExistant) {
    const { error: erreurPromotion } = await db
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", id);
    if (erreurPromotion) {
      console.error(
        `Compte créé, mais promotion en admin impossible : ${erreurPromotion.message}`,
      );
      process.exit(1);
    }
  } else {
    const { error: erreurInsertion } = await db.from("profiles").insert({
      id,
      full_name: NOM_AFFICHE,
      phone: telephone,
      role: "admin",
    });
    if (erreurInsertion) {
      console.error(
        `Compte créé, mais profil admin impossible à créer : ${erreurInsertion.message}`,
      );
      process.exit(1);
    }
  }

  console.log();
  console.log("Compte administrateur créé et promu :");
  console.log(`  id      : ${id}`);
  console.log(`  tél.    : ${TELEPHONE_SAISI}`);
  console.log(`  identifiant technique : ${email}`);
  console.log("Connexion : /connexion, numéro + mot de passe fourni à l'exécution.");
  console.log("Recommandation : changez ce mot de passe dès la première connexion (Sécurité du compte).");
}

await principal();