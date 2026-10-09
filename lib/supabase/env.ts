/**
 * Accès centralisé aux variables d'environnement Supabase.
 *
 * Les valeurs ne sont JAMAIS écrites en dur ici : elles viennent uniquement
 * de `.env.local` (ignoré par Git). Ce module sert de garde-fou : si le
 * fichier n'est pas encore rempli, on échoue au moment où le client est
 * réellement appelé, avec un message explicite, plutôt qu'au build ou avec
 * une `undefined` qui se propage dans l'API.
 *
 * ⚠️ Les variables sont lues par leur nom complet et non via un index
 * dynamique (`process.env[nom]`) : le bundler remplace `process.env.X` par une
 * chaîne littérale au build, et ne peut pas le faire pour un nom calculé. Une
 * lecture dynamique laisserait donc `process.env` vide dans le navigateur, et
 * le client Supabase échouerait à chaque appel.
 */

const URL_VAR = "NEXT_PUBLIC_SUPABASE_URL";
const KEY_VAR = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

/** Message d'erreur commun, avec le nom de la variable à renseigner. */
function missing(name: string): Error {
  return new Error(
    `[supabase] La variable d'environnement ${name} est manquante ou vide. ` +
      `Renseignez-la dans .env.local à la racine du projet ` +
      `(Supabase Dashboard > Connect : "Project URL" et "Publishable key").`,
  );
}

/** URL du projet Supabase, ex. `https://abcdefghijklm.supabase.co`. */
export function supabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) throw missing(URL_VAR);
  return value;
}

/**
 * Clé publique du projet.
 *
 * Avec le nouveau format de clés, cette valeur commence par `sb_publishable_`
 * au lieu d'être un JWT. Elle remplace la clé `anon` et s'utilise de façon
 * identique côté client ; @supabase/supabase-js la place dans l'en-tête
 * `apikey` sans jamais l'envoyer comme jeton Bearer.
 *
 * Le nom de la variable reste `..._ANON_KEY` pour ne rien changer à
 * l'appelant ; seule sa valeur est au nouveau format.
 */
export function supabasePublishableKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) throw missing(KEY_VAR);
  return value;
}
