/**
 * Compresse les images de `public/images/` en WebP.
 *
 * Les originaux restent intacts : le script écrit à côté, et n'écrase un
 * fichier que si le WebP obtenu est réellement plus léger. Il supprime ensuite
 * l'original quand celui-ci est superseded, pour éviter de shipper les deux.
 *
 * Usage : node scripts/compress-images.mjs [--force]
 */
import { writeFile, unlink, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIR = path.join(ROOT, "public", "images");
const QUALITY = 78;
const force = process.argv.includes("--force");

const ko = (n) => (n / 1024).toFixed(1);

async function compressOne(file) {
  const out = file.replace(/\.(png|jpe?g)$/i, ".webp");
  const before = (await stat(file)).size;

  if (existsSync(out) && !force) {
    const after = (await stat(out)).size;
    if (after < before) {
      await unlink(file);
      return { file, out, before, after, supprimé: true, dejaFait: true };
    }
  }

  const buf = await sharp(file)
    // `mozjpeg` rend un JPEG~15% plus petit qu'`jpeg` d'equalite visuelle.
    .webp({ quality: QUALITY, effort: 6, smartSubsample: true })
    .toBuffer();

  const after = buf.length;
  if (after >= before) {
    return { file, out: null, before, after, supprimé: false, dejaFait: false };
  }

  await writeFile(out, buf);
  await unlink(file);
  return { file, out, before, after, supprimé: true, dejaFait: false };
}

async function walk(dir) {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(full)));
    else if (/\.(png|jpe?g)$/i.test(e.name)) files.push(full);
  }
  return files;
}

const targets = await walk(DIR);
if (targets.length === 0) {
  console.log("Aucune image a compresser.");
  process.exit(0);
}

let totalBefore = 0;
let totalAfter = 0;
const rows = [];

for (const file of targets) {
  const r = await compressOne(file);
  totalBefore += r.before;
  totalAfter += r.after;
  rows.push(r);
}

console.log(`\nWebP qualite ${QUALITY}\n`);
console.log(
  `  ${"fichier".padEnd(34)}${"avant".padStart(10)}${"apres".padStart(10)}   etat`,
);
for (const r of rows) {
  const name = path.relative(path.join(ROOT, "public"), r.file);
  const state = r.dejaFait
    ? "deja compresse"
    : !r.out
      ? " conserve (WebP plus lourd)"
      : " compresse, original supprime";
  console.log(
    `  ${name.padEnd(34)}${(ko(r.before) + " Ko").padStart(10)}${(ko(r.after) + " Ko").padStart(10)}   ${state}`,
  );
}
const gain = ((1 - totalAfter / totalBefore) * 100).toFixed(1);
console.log(
  `\n  Total : ${ko(totalBefore)} Ko -> ${ko(totalAfter)} Ko  (-${gain} %, -${ko(totalBefore - totalAfter)} Ko)\n`,
);
