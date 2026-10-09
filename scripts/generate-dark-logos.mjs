/**
 * Génère les versions sombres des logos KAS.
 *
 * Règle : les pixels bordeaux sont conservés tels quels ; les pixels noirs,
 * gris foncés ou bleu nuit deviennent blancs. L'alpha est préservé afin de
 * ne pas abîmer l'anti-aliasing, et le blanc est rendu transparent (fond du
 * blason Cleaning) pour que le glyphe central reste visible sur fond sombre.
 *
 * Le PNG est décodé puis ré-encodé directement (PNG RGBA 8 bits, non entrelacé,
 * compression zlib) : aucune dépendance externe n'est nécessaire.
 *
 * Usage : node scripts/generate-dark-logos.mjs
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const IMAGES_DIR = path.join(process.cwd(), "public", "images");

const LOGOS = [
  { src: "logo-kas-immobilier.webp", out: "logo-kas-immobilier-dark.webp" },
  { src: "logo-kas-cleaning.webp", out: "logo-kas-cleaning-dark.webp" },
];

/** Un pixel est « bordeaux » si le rouge domine nettement le bleu et le vert. */
function isBordeaux(r, g, b) {
  return r - b > 25 && r - g > 30;
}

function decodePng(buffer) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (pos < buffer.length) {
    const length = buffer.readUInt32BE(pos);
    const type = buffer.toString("ascii", pos + 4, pos + 8);
    const data = buffer.subarray(pos + 8, pos + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + length;
  }

  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(
      `PNG non supporté (bitDepth=${bitDepth}, colorType=${colorType})`,
    );
  }

  const channels = 4;
  const bpp = 4;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);

  let p = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    const line = raw.subarray(p, p + stride);
    p += stride;
    const cur = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;

    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }

  return { width, height, pixels };
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng({ width, height, pixels }) {
  const stride = width * 4;
  const rows = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    rows[y * (stride + 1)] = 0; // filtre None : les logos sont petits
    pixels.copy(rows, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // profondeur
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function toDark({ width, height, pixels }) {
  const out = Buffer.from(pixels);
  const stats = { transparent: 0, white: 0, dark: 0, blended: 0, bordeaux: 0 };

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];

    if (alpha === 0) {
      stats.transparent++;
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
      continue;
    }

    // On dé-prémultiplie pour raisonner sur la couleur d'origine.
    const scale = 255 / alpha;
    const r = Math.min(255, pixels[i] * scale);
    const g = Math.min(255, pixels[i + 1] * scale);
    const b = Math.min(255, pixels[i + 2] * scale);

    if (isBordeaux(r, g, b)) {
      // Le bordeaux est laissé strictement intact.
      stats.bordeaux++;
      continue;
    }

    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;

    if (lum >= 245) {
      // Blanc pur : c'est le fond du blason, on le rend transparent.
      out[i + 3] = 0;
      stats.white++;
    } else if (lum <= 96) {
      // Noir / gris foncé / bleu nuit : blanc opaque, alpha d'origine conservé.
      out[i + 3] = alpha;
      stats.dark++;
    } else {
      // Zone de transition (anti-aliasing noir <-> blanc) : on reconstruit le
      // dégradé en faisant varier l'alpha, la couleur reste blanche.
      out[i + 3] = Math.round(alpha * (1 - lum / 255));
      stats.blended++;
    }
  }

  return { image: { width, height, pixels: out }, stats };
}

for (const { src, out } of LOGOS) {
  const input = decodePng(fs.readFileSync(path.join(IMAGES_DIR, src)));
  const { image, stats } = toDark(input);
  fs.writeFileSync(path.join(IMAGES_DIR, out), encodePng(image));

  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;
  console.log(
    `${src} -> ${out}  (${image.width}x${image.height})  ` +
      `bordeaux ${pct(stats.bordeaux)} | noir->blanc ${pct(stats.dark)} | ` +
      `blanc->transparent ${pct(stats.white)} | degrade ${pct(stats.blended)}`,
  );
}
