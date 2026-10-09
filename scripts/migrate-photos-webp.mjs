/**
 * Migration des photos existantes vers le WebP.
 *
 * Le site déposait les photos telles qu'elles étaient fournies : jusqu'à 1 Mo
 * en PNG. L'optimiseur d'images de Next devait alors télécharger ce mégaoctet
 * depuis le stockage avant de servir la photo, ce qui provoquait des erreurs
 * 500 dès que la liaison ralentissait. Ce script ré-encode les photos déjà en
 * ligne en WebP, bien plus légères.
 *
 * Séquence par photo, volontairement prudente :
 *   1. sauvegarde des octets d'origine sur le disque,
 *   2. dépôt du WebP sous un nouveau chemin,
 *   3. vérification que la nouvelle URL répond 200 et sert bien du WebP,
 *   4. mise à jour de la ligne en base,
 *   5. et seulement ensuite, suppression de l'ancien fichier.
 *
 * Si une étape échoue, l'ancien fichier reste en place et la base continue de
 * pointer dessus. Les octets d'origine étant sauvegardés, la migration est
 * intégralement réversible.
 *
 * L'extension vit dans l'URL en base, et le chemin utilisé à la suppression est
 * reconstruit à partir de cette URL : les deux sont mis à jour ensemble, sinon
 * la photo deviendrait invisible.
 *
 * Usage :
 *   node scripts/migrate-photos-webp.mjs           simulation, n'écrit rien
 *   node scripts/migrate-photos-webp.mjs --apply   exécute la migration
 */
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

import { toWebp } from "../lib/image-webp.ts";

const APPLIQUER = process.argv.includes("--apply");
const RACINE = process.cwd();
/** Sauvegarde des originaux : c'est elle qui rend l'opération réversible. */
const SAUVEGARDE = path.join(RACINE, "sauvegarde-photos-avant-webp");

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
const db = createClient(URL_PROJET, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

/** Chaque source : un bucket, la table qui porte ses URL, et la colonne visée. */
const SOURCES = [
  { bucket: "properties", table: "property_photos", colonne: "url" },
  { bucket: "cleaning", table: "cleaning_services", colonne: "image_url" },
];

/** Préfixe public d'un objet : c'est ce que reconstruit la suppression. */
function urlPublique(bucket, chemin) {
  return `${URL_PROJET}/storage/v1/object/public/${bucket}/${chemin}`;
}

/** Retire le préfixe public pour retrouver le chemin interne. */
function cheminDepuisUrl(bucket, url) {
  const prefixe = `${URL_PROJET}/storage/v1/object/public/${bucket}/`;
  return url.startsWith(prefixe) ? url.slice(prefixe.length) : null;
}

const md5 = (b) => createHash("md5").update(b).digest("hex");
const ko = (n) => `${(n / 1024).toFixed(1)} Ko`;

/** Rassemble les photos en base non encore en WebP, avec leur ligne d'origine. */
async function collecterLesPhotos() {
  const aTraiter = [];
  for (const { bucket, table, colonne } of SOURCES) {
    const { data, error } = await db.from(table).select(`id, ${colonne}`);
    if (error) throw new Error(`lecture ${table} : ${error.message}`);
    for (const ligne of data ?? []) {
      const url = ligne[colonne];
      if (!url) continue;
      const chemin = cheminDepuisUrl(bucket, url);
      if (!chemin) {
        console.warn(`  ⚠ URL étrangère au bucket ${bucket}, ignorée : ${url}`);
        continue;
      }
      if (chemin.toLowerCase().endsWith(".webp")) continue;
      aTraiter.push({ bucket, table, colonne, id: ligne.id, url, chemin });
    }
  }
  return aTraiter;
}

/** Confirme que l'URL publique sert bien une image WebP non vide. */
async function verifierUrl(url) {
  const reponse = await fetch(url, { cache: "no-store" });
  if (!reponse.ok) return `HTTP ${reponse.status}`;
  const type = reponse.headers.get("content-type") ?? "";
  if (!type.includes("webp")) return `type inattendu : ${type}`;
  const corps = Buffer.from(await reponse.arrayBuffer());
  if (corps.byteLength === 0) return "fichier vide";
  return null;
}

async function principal() {
  const photos = await collecterLesPhotos();

  if (photos.length === 0) {
    console.log("Aucune photo à migrer.");
    return;
  }

  console.log(
    APPLIQUER
      ? `Migration de ${photos.length} photo(s) vers le WebP.`
      : `SIMULATION — ${photos.length} photo(s) seraient converties. Relancer avec --apply.`,
  );
  console.log();

  const journal = [];
  let converties = 0;
  let conservees = 0;
  let echecs = 0;

  for (const photo of photos) {
    const nouveauChemin = photo.chemin.replace(/\.[^.]+$/, ".webp");

    const { data: telecharge, error: erreurTelechargement } = await db.storage
      .from(photo.bucket)
      .download(photo.chemin);
    if (erreurTelechargement || !telecharge) {
      console.warn(`  ✗ ${photo.chemin} : téléchargement impossible (${erreurTelechargement?.message})`);
      echecs++;
      continue;
    }

    const original = Buffer.from(await telecharge.arrayBuffer());

    // 1. Sauvegarde des octets d'origine : c'est ce qui permet de revenir en arrière.
    if (APPLIQUER) {
      const destination = path.join(SAUVEGARDE, photo.bucket, photo.chemin);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, original);
    }

    // 2. Conversion.
    const converti = await toWebp(original);
    if (!converti) {
      console.log(`  – ${photo.chemin} : ${ko(original.byteLength)} — conversion sans gain, conservé`);
      conservees++;
      journal.push({ ...photo, nouveauChemin: null, action: "conserve" });
      continue;
    }

    const gain = (1 - converti.webp.byteLength / original.byteLength) * 100;
    console.log(
      `  ${APPLIQUER ? "→" : "·"} ${photo.chemin}\n` +
        `      ${ko(original.byteLength)} → ${ko(converti.webp.byteLength)}  (-${gain.toFixed(0)} %)`,
    );

    if (!APPLIQUER) {
      converties++;
      journal.push({ ...photo, nouveauChemin, action: "a convertir" });
      continue;
    }

    // 3. Dépôt du WebP.
    const { error: erreurDepot } = await db.storage
      .from(photo.bucket)
      .upload(nouveauChemin, converti.webp, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: true,
      });
    if (erreurDepot) {
      console.warn(`      ✗ dépôt refusé : ${erreurDepot.message}`);
      echecs++;
      continue;
    }

    const nouvelleUrl = urlPublique(photo.bucket, nouveauChemin);

    // 4. Vérification AVANT de toucher à la base : si la nouvelle URL ne
    //    répond pas, l'ancien fichier reste en place et rien n'est modifié.
    const anomalie = await verifierUrl(nouvelleUrl);
    if (anomalie) {
      console.warn(`      ✗ nouvelle URL inexploitable (${anomalie}) — base et ancien fichier intacts`);
      echecs++;
      continue;
    }

    // 5. Base : l'extension de l'URL doit suivre, sinon la photo est invisible.
    const { error: erreurBase } = await db
      .from(photo.table)
      .update({ [photo.colonne]: nouvelleUrl })
      .eq("id", photo.id);
    if (erreurBase) {
      console.warn(`      ✗ base non mise à jour : ${erreurBase.message} — ancien fichier conservé`);
      echecs++;
      continue;
    }

    // 6. L'ancien fichier n'est retiré qu'une fois la base cohérente.
    const { error: erreurSuppression } = await db.storage
      .from(photo.bucket)
      .remove([photo.chemin]);

    journal.push({
      bucket: photo.bucket,
      table: photo.table,
      id: photo.id,
      ancienChemin: photo.chemin,
      nouveauChemin,
      ancienneUrl: photo.url,
      nouvelleUrl,
      octetsAvant: original.byteLength,
      octetsApres: converti.webp.byteLength,
      md5Original: md5(original),
      ancienSupprime: !erreurSuppression,
    });
    converties++;
    console.log(`      ✓ base à jour, ancien fichier ${erreurSuppression ? "NON supprimé" : "supprimé"}`);
  }

  console.log();
  console.log(`  converties : ${converties}   conservées : ${conservees}   en échec : ${echecs}`);

  if (APPLIQUER) {
    await fs.mkdir(SAUVEGARDE, { recursive: true });
    const fichier = path.join(SAUVEGARDE, "migration.json");
    await fs.writeFile(fichier, JSON.stringify(journal, null, 2));
    console.log();
    console.log(`  Journal de migration : ${fichier}`);
    console.log(`  Originaux sauvegardés : ${SAUVEGARDE}`);
  }
}

await principal();
