import type {
  Property,
  PropertyPhoto,
  PropertyType,
  TransactionType,
} from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/public";

import {
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  type PropertyWithPhotos,
} from "./properties";

/**
 * Lecture publique du catalogue.
 *
 * Séparé de `lib/properties-admin.ts`, qui reste réservé à l'espace admin :
 * celui-ci utilise la session de l'utilisateur, celui-ci la clé publiable sans
 * session. Deux chemins de lecture distincts, donc deux modules distincts — on
 * ne mélange jamais les deux dans une même fonction.
 *
 * Aucune clé secrète n'est utilisée ici : la RLS en rôle `anon` filtre
 * elle-même ce qui est visible. Le catalogue public ne demande donc que
 * `status = "disponible"`, ce qui est une règle de catalogue, et non une
 * précaution de sécurité — un bien loué reste d'ailleurs lisible en direct si
 * l'on connaît son identifiant, ce qui est sans conséquence.
 */

const SELECT_BIEN =
  "id, title, description, type, transaction_type, price, location, status, created_by, created_at, property_photos (id, property_id, url, position, created_at)";

/**
 * Nombre de biens affichés sur l'accueil, dans la fourchette de 3 à 6 prévue.
 *
 * C'est un plafond, pas un minimum : si l'administrateur n'a publié qu'un seul
 * bien disponible, il est affiché. Masquer la section dans ce cas laisserait un
 * bien invisible sur la page d'accueil alors qu'il est bien publié, et donnerait
 * l'impression que l'enregistrement a échoué.
 */
export const BIENS_A_LUNE_MAX = 6;

type BienRow = Omit<Property, "price"> & {
  price: number;
  property_photos: PropertyPhoto[];
};

/** Filtres du catalogue, tels qu'ils arrivent dans l'URL. */
export type CatalogueFiltres = {
  transaction?: TransactionType;
  type?: PropertyType;
  prixMin?: number;
  prixMax?: number;
  recherche?: string;
  /** Inclure les biens loués et vendus, que le catalogue masque par défaut. */
  inclureIndisponibles: boolean;
};

export const CATALOGUE_FILTRES_VIDES: CatalogueFiltres = {
  inclureIndisponibles: false,
};

const isOneOf = <T extends string>(
  valeurs: readonly T[],
  valeur: string,
): valeur is T => (valeurs as readonly string[]).includes(valeur);

const VALEURS_TYPES = PROPERTY_TYPES.map((item) => item.value);
const VALEURS_TRANSACTIONS = TRANSACTION_TYPES.map((item) => item.value);

/**
 * Un identifiant de bien est un UUID : tout le reste mène à un 404.
 *
 * La règle elle-même vit dans `lib/ids` — elle était dupliquée dans cinq
 * fichiers, et une copie fausse a suffi à casser les demandes de visite.
 * Réexportée ici pour ne pas casser les appelants existants.
 */
import { estUuid } from "@/lib/ids";

export { estUuid };

/**
 * Échappe les jokers SQL d'une recherche en `ilike`.
 *
 * Un `%` ou un `_` saisis par un visiteur serait sinon interprété comme un
 * joker et ramènerait des milliers de lignes au lieu d'une recherche.
 */
function echapperLike(value: string): string {
  return value.replace(/[\\%_]/g, (caractere) => `\\${caractere}`);
}

/**
 * Nettoie une saisie utilisateur destinée au filtre `or()` de PostgREST.
 *
 * Ce filtre s'analyse lui-même : une virgule, un point-virgule, une parenthèse
 * ou un guillemet dans la saisie serait pris pour de la syntaxe et ferait
 * échouer toute la requête, donc la saisie est réduite à des caractères
 * inoffensifs.
 */
function nettoyerRecherche(value: string): string {
  return value
    .replace(/[,;()"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/** Lit un entier positif depuis les paramètres d'URL. */
function lireEntier(valeur: string | string[] | undefined): number | undefined {
  const brut = Array.isArray(valeur) ? valeur[0] : valeur;
  if (!brut) return undefined;

  // Aucun `parseInt` direct : il accepte « 12abc » et renverrait 12.
  if (!/^\d{1,12}$/.test(brut.trim())) return undefined;

  const nombre = Number(brut.trim());
  return Number.isSafeInteger(nombre) ? nombre : undefined;
}

function lireTexte(valeur: string | string[] | undefined): string | undefined {
  const brut = Array.isArray(valeur) ? valeur[0] : valeur;
  const texte = brut?.trim();
  return texte ? texte : undefined;
}

/** Un interrupteur à cocher n'est présent dans l'URL que s'il est coché. */
function lireInterrupteur(valeur: string | string[] | undefined): boolean {
  const brut = Array.isArray(valeur) ? valeur[0] : valeur;
  return brut === "1" || brut === "true" || brut === "on";
}

/**
 * Traduit les `searchParams` de la page en filtres typés.
 *
 * Toute valeur non reconnue est ignorée plutôt que de provoquer une erreur :
 * une URL bricquée à la main ne doit pas casser la page, elle doit simplement
 * retomber sur le catalogue par défaut.
 */
export function parseFiltres(
  searchParams: Record<string, string | string[] | undefined>,
): CatalogueFiltres {
  const filtres: CatalogueFiltres = { inclureIndisponibles: false };

  const transaction = lireTexte(searchParams.transaction);
  if (transaction && isOneOf(VALEURS_TRANSACTIONS, transaction)) {
    filtres.transaction = transaction;
  }

  const type = lireTexte(searchParams.type);
  if (type && isOneOf(VALEURS_TYPES, type)) {
    filtres.type = type;
  }

  const prixMin = lireEntier(searchParams.prixMin);
  if (prixMin !== undefined) filtres.prixMin = prixMin;

  const prixMax = lireEntier(searchParams.prixMax);
  if (prixMax !== undefined) filtres.prixMax = prixMax;

  // Une fourchette inversée est réordonnée plutôt que rejetée : un visiteur
  // qui saisit 10 puis 3 dans les mauvais champs veut dire « entre 3 et 10 ».
  if (
    filtres.prixMin !== undefined &&
    filtres.prixMax !== undefined &&
    filtres.prixMin > filtres.prixMax
  ) {
    [filtres.prixMin, filtres.prixMax] = [filtres.prixMax, filtres.prixMin];
  }

  const recherche = nettoyerRecherche(lireTexte(searchParams.recherche) ?? "");
  if (recherche) filtres.recherche = recherche;

  filtres.inclureIndisponibles = lireInterrupteur(searchParams.indisponibles);

  return filtres;
}

/** Vrai si au moins un filtre est actif — pilote le bouton « Réinitialiser ». */
export function aDesFiltresActifs(filtres: CatalogueFiltres): boolean {
  return Boolean(
    filtres.transaction ||
    filtres.type ||
    filtres.prixMin !== undefined ||
    filtres.prixMax !== undefined ||
    filtres.recherche ||
    filtres.inclureIndisponibles,
  );
}

/** Tri des photos par `position`, puis Recent → Ancien. */
function versBien(row: BienRow): PropertyWithPhotos {
  const { property_photos, ...bien } = row;

  return {
    ...bien,
    photos: [...(property_photos ?? [])].sort(
      (a, b) => a.position - b.position,
    ),
  };
}

function erreurLisibles(
  error: { message: string } | null,
  contexte: string,
): never {
  throw new Error(
    `Catalogue indisponible (${contexte}) : ${error?.message ?? "raison inconnue"}`,
  );
}

/**
 * Catalogue public, filtres appliqués, du plus récent au plus ancien.
 *
 * Par défaut seuls les biens `disponible` remontent : c'est la règle de
 * catalogue demandée. Les biens loués ou vendus ne reviennent que si le
 * visiteur coche explicitement la case correspondante.
 */
export async function listerBiensPublics(
  filtres: CatalogueFiltres = CATALOGUE_FILTRES_VIDES,
  limite?: number,
): Promise<PropertyWithPhotos[]> {
  const supabase = createPublicClient();

  let query = supabase
    .from("properties")
    .select(SELECT_BIEN)
    .order("created_at", { ascending: false });

  if (!filtres.inclureIndisponibles) {
    query = query.eq("status", "disponible");
  }

  if (filtres.transaction) {
    query = query.eq("transaction_type", filtres.transaction);
  }

  if (filtres.type) {
    query = query.eq("type", filtres.type);
  }

  if (filtres.prixMin !== undefined) {
    query = query.gte("price", filtres.prixMin);
  }

  if (filtres.prixMax !== undefined) {
    query = query.lte("price", filtres.prixMax);
  }

  if (filtres.recherche) {
    // Le titre ET la localisation, insensitive à la casse. La saisie a déjà
    // été nettoyée de la syntaxe PostgREST par `nettoyerRecherche`.
    const motif = `%${echapperLike(filtres.recherche)}%`;
    query = query.or(`title.ilike.${motif},location.ilike.${motif}`);
  }

  if (limite !== undefined) {
    query = query.limit(limite);
  }

  const { data, error } = await query;

  if (error) erreurLisibles(error, "liste des biens");

  return (data ?? []).map((row) => versBien(row as BienRow));
}

/** Un bien et ses photos, ou `null` s'il n'existe pas ou plus. */
export async function trouverBienPublic(
  id: string,
): Promise<PropertyWithPhotos | null> {
  if (!estUuid(id)) return null;

  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("properties")
    .select(SELECT_BIEN)
    .eq("id", id)
    .maybeSingle();

  if (error) erreurLisibles(error, "fiche d'un bien");

  return data ? versBien(data as BienRow) : null;
}

/**
 * Les biens disponibles les plus récents, pour l'accueil.
 *
 * Renvoie une liste éventuellement courte : c'est l'appelant qui décide de
 * masquer la section quand elle est vide.
 */
export async function listerBiensRecents(
  limite = BIENS_A_LUNE_MAX,
): Promise<PropertyWithPhotos[]> {
  return listerBiensPublics(CATALOGUE_FILTRES_VIDES, limite);
}

/** Bornes de prix du catalogue, pour renseigner les champs min/max. */
export async function bornesPrixPublics(): Promise<{
  min: number;
  max: number;
}> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("properties")
    .select("price")
    .eq("status", "disponible")
    .order("price", { ascending: true })
    .limit(1);

  if (error) erreurLisibles(error, "prix minimum");

  const plusBas = (data?.[0] as { price: number } | undefined)?.price;

  const { data: data2, error: error2 } = await supabase
    .from("properties")
    .select("price")
    .eq("status", "disponible")
    .order("price", { ascending: false })
    .limit(1);

  if (error2) erreurLisibles(error2, "prix maximum");

  const plusHaut = (data2?.[0] as { price: number } | undefined)?.price;

  return { min: plusBas ?? 0, max: plusHaut ?? 0 };
}

/** Libellés des options de filtre, réutilisés par le formulaire. */
export const OPTIONS_TRANSACTION = TRANSACTION_TYPES.map(
  ({ value, label }) => ({ value, label }),
);
export const OPTIONS_TYPE = PROPERTY_TYPES.map(({ value, label }) => ({
  value,
  label,
}));

/** « Location · Appartement », pour la ligne de méta d'une carte. */
export function resumeType(bien: {
  type: PropertyType;
  transaction_type: TransactionType;
}): string {
  return `${TRANSACTION_TYPE_LABELS[bien.transaction_type]} · ${PROPERTY_TYPE_LABELS[bien.type]}`;
}
