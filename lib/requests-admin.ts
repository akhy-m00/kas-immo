import type {
  CleaningService,
  Property,
  Request,
  RequestStatus,
  RequestType,
} from "@/lib/supabase/database.types";
import {
  REQUEST_STATUS_LABELS,
  STATUS_VALUES,
  type RequestWithProperty,
} from "@/lib/requests";
import { createClient } from "@/lib/supabase/server";

/**
 * Accès aux demandes côté serveur, pour l'espace d'administration.
 *
 * ⚠️ Même règle que pour les biens et le cleaning : toutes les lectures et
 * toutes les écritures passent par `createClient()`, c'est-à-dire par le
 * client de la session de l'utilisateur connecté. Aucune clé de service n'est
 * utilisée nulle part dans le projet : c'est ce qui fait que les politiques RLS
 * s'appliquent réellement.
 *
 * Les gardes `requireAdmin()` sont dans les Server Actions
 * (`app/admin/demandes/actions.ts`), pas ici — ce module est appelé par des
 * pages admin, protégées par `app/admin/layout.tsx`, comme par les actions.
 */

/** Le bien tel que renvoyé par la jointure PostgREST. */
type BienJoint = Pick<Property, "id" | "title" | "location" | "status">;

/** La prestation cleaning telle que renvoyée par la jointure PostgREST. */
type PrestationJoint = Pick<CleaningService, "id" | "title" | "image_url">;

/**
 * Sélecteur d'une demande avec son objet.
 *
 * `properties (...)` et `cleaning_services (...)` sont résolus par PostgREST via
 * les clés étrangères `requests_property_id_fkey` et
 * `requests_cleaning_service_id_fkey`. Elles renvoient `null` si l'objet a été
 * supprimé : les deux colonnes sont en ON DELETE SET NULL, une demande ne doit
 * donc jamais disparaître de la file de traitement.
 */
const REQUEST_SELECT =
  "id, user_id, type, property_id, cleaning_service_id, cleaning_type, full_name, phone, message, desired_date, desired_time, status, created_at, properties (id, title, location, status), cleaning_services (id, title, image_url)";

/** Une ligne de `requests` avec ses jointures, avant mise en forme. */
type RequestRow = Request & {
  properties: BienJoint | null;
  cleaning_services: PrestationJoint | null;
};

/** Reconstruit la forme attendue par les composants. */
function versDemande(row: RequestRow): RequestWithProperty {
  const { properties, cleaning_services, ...demande } = row;

  return {
    ...demande,
    property: properties ?? null,
    cleaningService: cleaning_services ?? null,
  };
}

/**
 * Filtres de la liste des demandes, tels qu'ils arrivent dans l'URL.
 *
 * `statut` et `type` sont typés par leurs valeurs d'enum, et non par `string` :
 * `parseRequestFilters` a déjà refusé toute valeur inconnue, donc le type
 * narrow est exact et évite un `as` à chaque appel d'un `.eq()`.
 */
export type RequestFilters = {
  statut?: RequestStatus;
  type?: RequestType;
  recherche?: string;
};

const isOneOf = <T extends string>(
  valeurs: readonly T[],
  valeur: string,
): valeur is T => (valeurs as readonly string[]).includes(valeur);

/**
 * Traduit les `searchParams` en filtres typés.
 *
 * Comme pour le catalogue public, une valeur non reconnue est ignorée plutôt
 * qu'elle ne fasse échouer la requête : une URL bricquée doit retomber sur la
 * liste complète, pas sur une erreur.
 */
export function parseRequestFilters(
  searchParams: Record<string, string | string[] | undefined>,
): RequestFilters {
  const filtres: RequestFilters = {};

  const statut = lireTexte(searchParams.statut);
  if (statut && isOneOf(STATUS_VALUES, statut)) {
    filtres.statut = statut as RequestStatus;
  }

  const type = lireTexte(searchParams.type);
  if (type && (type === "visite_bien" || type === "devis_cleaning")) {
    filtres.type = type as RequestType;
  }

  const recherche = nettoyerRecherche(lireTexte(searchParams.recherche) ?? "");
  if (recherche) filtres.recherche = recherche;

  return filtres;
}

function lireTexte(valeur: string | string[] | undefined): string | undefined {
  const brut = Array.isArray(valeur) ? valeur[0] : valeur;
  const texte = brut?.trim();
  return texte ? texte : undefined;
}

/** Échappe les jokers `%` et `_` d'une recherche `ilike`. */
function echapperLike(value: string): string {
  return value.replace(/[\\%_]/g, (caractere) => `\\${caractere}`);
}

/**
 * Réduit une saisie à des caractères inoffensifs pour PostgREST.
 *
 * Le filtre `or()` s'analyse lui-même : une virgule, un point-virgule ou un
 * guillemet dans la saisie serait pris pour de la syntaxe et ferait échouer
 * toute la requête. Même traitement que `lib/properties-public.ts`.
 */
function nettoyerRecherche(value: string): string {
  return value
    .replace(/[,;()"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

// =============================================================================
// Lecture
// =============================================================================

/**
 * Les demandes, filtres appliqués, les plus récentes d'abord.
 *
 * Le tri est fait par la base sur `created_at`, indexé en `desc`. Les
 * « En attente » ne sont donc pas remontées en tête : la liste reste lisible
 * comme un fil d'arrivée, et c'est le FILTRE par statut — mis en avant dans
 * l'interface — qui isole les demandes à traiter.
 */
export async function listRequests(
  filters: RequestFilters = {},
): Promise<RequestWithProperty[]> {
  const supabase = await createClient();

  let query = supabase
    .from("requests")
    .select(REQUEST_SELECT)
    .order("created_at", { ascending: false });

  if (filters.statut) {
    query = query.eq("status", filters.statut);
  }

  if (filters.type) {
    query = query.eq("type", filters.type);
  }

  if (filters.recherche) {
    // Nom ou téléphone : ce sont les deux seules coordonnées portées par la
    // demande. L'e-mail du demandeur n'en fait pas partie — il appartient à son
    // compte, et se cherche donc dans les utilisateurs, pas dans cette file.
    const motif = `%${echapperLike(filters.recherche)}%`;
    query = query.or(`full_name.ilike.${motif},phone.ilike.${motif}`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      erreurMessage(error, "Les demandes sont injoignables."),
    );
  }

  return (data ?? []).map((row) => versDemande(row as RequestRow));
}

/**
 * Nombre total de demandes, sans filtre.
 *
 * N'est demandé que lorsqu'un filtre est actif, pour distinguer « aucune
 * demande reçue » de « aucune demande pour ces critères », sans coûter une
 * requête de plus dans le cas courant.
 */
export async function countRequests(): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("requests")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new Error(erreurMessage(error, "Les demandes sont injoignables."));
  }

  return count ?? 0;
}

// =============================================================================
// Écriture
// =============================================================================

/** Résultat d'une écriture : succès, ou message d'erreur à afficher. */
export type RequestWriteResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Change le statut d'une demande.
 *
 * Comme pour la suppression d'un bien, `.select()` est appelé après
 * l'écriture : une ligne exclue par une politique RLS ne produit AUCUNE erreur,
 * la mise à jour est simplement sans effet. Sans cette relecture, un
 * administrateur à qui ses droits viennent d'être retirés verrait « enregistré »
 * alors que rien n'a bougé.
 */
export async function updateRequestStatus(
  id: string,
  status: RequestStatus,
): Promise<RequestWriteResult> {
  const supabase = await createClient();

  const { data: modifie, error } = await supabase
    .from("requests")
    .update({ status })
    .eq("id", id)
    .select("id");

  if (error) {
    return {
      ok: false,
      error: erreurMessage(
        error,
        "Le statut de la demande n'a pas pu être modifié.",
      ),
    };
  }

  // `.select("id")` relit la ligne écrite : c'est la seule façon de détecter un
  // refus silencieux de RLS, où PostgREST répond sans erreur mais sans ligne.
  if (!modifie || modifie.length === 0) {
    return {
      ok: false,
      error:
        "La demande n'a pas pu être mise à jour : l'identifiant est valide mais aucune ligne n'a été modifiée (demande supprimée entre-temps, ou politique RLS).",
    };
  }

  return { ok: true, id };
}

/** Supprime définitivement une demande. */
export async function deleteRequest(id: string): Promise<RequestWriteResult> {
  const supabase = await createClient();

  const { data: supprime, error } = await supabase
    .from("requests")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return {
      ok: false,
      error: erreurMessage(error, "La demande n'a pas pu être supprimée."),
    };
  }

  if (!supprime || supprime.length === 0) {
    return {
      ok: false,
      error:
        "Cette demande n'existe plus, ou ce compte administrateur n'a plus le droit de la supprimer.",
    };
  }

  return { ok: true, id };
}

/** Traduit une erreur Supabase en message compréhensible. */
function erreurMessage(
  error: { code?: string; message?: string } | null,
  defaut: string,
): string {
  if (!error) return defaut;

  // RLS : le détail technique n'aide pas l'administrateur, et la page
  // n'est de toute façon accessible qu'à un compte connecté.
  if (error.code === "42501") {
    return "Ce compte administrateur n'a plus les droits nécessaires.";
  }

  return defaut;
}

// =============================================================================
// Statistiques analytiques pour le tableau de bord
// =============================================================================

export type AnalyticsStatusItem = {
  status: RequestStatus;
  label: string;
  immobilier: number;
  cleaning: number;
  total: number;
};

export type AnalyticsPoint = {
  key: string;
  label: string;
  fullDate: string;
  immobilier: number;
  cleaning: number;
  total: number;
};

export type AdminAnalyticsData = {
  totalDemandes: number;
  demandesImmobilier: number;
  demandesCleaning: number;
  demandesEnAttente: number;
  demandesTraitees: number;
  tauxTraitement: number;
  byStatus: AnalyticsStatusItem[];
  last7Days: AnalyticsPoint[];
  last30Days: AnalyticsPoint[];
  last6Months: AnalyticsPoint[];
  totalBiens: number;
  totalCleaningServices: number;
};

const MONTH_NAMES_FR = [
  "Janv",
  "Févr",
  "Mars",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sept",
  "Oct",
  "Nov",
  "Déc",
];

const JOURS_SEMAINE_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MOIS_COMPLETS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export async function getAdminAnalytics(): Promise<AdminAnalyticsData> {
  const supabase = await createClient();

  const [requestsRes, propertiesRes, cleaningRes] = await Promise.all([
    supabase
      .from("requests")
      .select("id, type, status, created_at")
      .order("created_at", { ascending: true }),
    supabase.from("properties").select("id, status"),
    supabase
      .from("cleaning_services")
      .select("id", { count: "exact", head: true }),
  ]);

  if (requestsRes.error) {
    console.warn("Analytics: requests fetch warning", requestsRes.error);
  }

  const requests = requestsRes.data ?? [];
  const properties = propertiesRes.data ?? [];
  const cleaningCount = cleaningRes.count ?? 0;

  let demandesImmobilier = 0;
  let demandesCleaning = 0;
  let demandesEnAttente = 0;
  let demandesTraitees = 0;

  const statusCounts: Record<
    RequestStatus,
    { immobilier: number; cleaning: number }
  > = {
    nouveau: { immobilier: 0, cleaning: 0 },
    en_cours: { immobilier: 0, cleaning: 0 },
    accepte: { immobilier: 0, cleaning: 0 },
    termine: { immobilier: 0, cleaning: 0 },
    refuse: { immobilier: 0, cleaning: 0 },
  };

  const now = new Date();

  const toDayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;

  const toMonthKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  // 1. 7 derniers jours (jours calendaires avec 0 par défaut)
  const map7Days = new Map<string, AnalyticsPoint>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = toDayKey(d);
    const label = `${JOURS_SEMAINE_FR[d.getDay()]} ${d.getDate()}`;
    const fullDate = `${JOURS_SEMAINE_FR[d.getDay()]} ${d.getDate()} ${
      MONTH_NAMES_FR[d.getMonth()]
    } ${d.getFullYear()}`;
    map7Days.set(key, {
      key,
      label,
      fullDate,
      immobilier: 0,
      cleaning: 0,
      total: 0,
    });
  }

  // 2. 30 derniers jours (jours calendaires avec 0 par défaut)
  const map30Days = new Map<string, AnalyticsPoint>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = toDayKey(d);
    const label = `${d.getDate()} ${MONTH_NAMES_FR[d.getMonth()]}`;
    const fullDate = `${d.getDate()} ${
      MOIS_COMPLETS_FR[d.getMonth()]
    } ${d.getFullYear()}`;
    map30Days.set(key, {
      key,
      label,
      fullDate,
      immobilier: 0,
      cleaning: 0,
      total: 0,
    });
  }

  // 3. 6 derniers mois (mois civils avec 0 par défaut)
  const map6Months = new Map<string, AnalyticsPoint>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = toMonthKey(d);
    const label = MONTH_NAMES_FR[d.getMonth()];
    const fullDate = `${
      MOIS_COMPLETS_FR[d.getMonth()]
    } ${d.getFullYear()}`;
    map6Months.set(key, {
      key,
      label,
      fullDate,
      immobilier: 0,
      cleaning: 0,
      total: 0,
    });
  }

  for (const req of requests) {
    const isImmo = req.type === "visite_bien";
    const isClean = req.type === "devis_cleaning";

    if (isImmo) demandesImmobilier += 1;
    if (isClean) demandesCleaning += 1;
    if (req.status === "nouveau") demandesEnAttente += 1;
    if (req.status === "accepte" || req.status === "termine") {
      demandesTraitees += 1;
    }

    if (statusCounts[req.status]) {
      if (isImmo) statusCounts[req.status].immobilier += 1;
      if (isClean) statusCounts[req.status].cleaning += 1;
    }

    if (req.created_at) {
      const d = new Date(req.created_at);
      const dayKey = toDayKey(d);
      const monthKey = toMonthKey(d);

      const p7 = map7Days.get(dayKey);
      if (p7) {
        if (isImmo) p7.immobilier += 1;
        if (isClean) p7.cleaning += 1;
        p7.total += 1;
      }

      const p30 = map30Days.get(dayKey);
      if (p30) {
        if (isImmo) p30.immobilier += 1;
        if (isClean) p30.cleaning += 1;
        p30.total += 1;
      }

      const p6m = map6Months.get(monthKey);
      if (p6m) {
        if (isImmo) p6m.immobilier += 1;
        if (isClean) p6m.cleaning += 1;
        p6m.total += 1;
      }
    }
  }

  const byStatus: AnalyticsStatusItem[] = (
    ["nouveau", "en_cours", "accepte", "termine", "refuse"] as RequestStatus[]
  ).map((status) => ({
    status,
    label: REQUEST_STATUS_LABELS[status],
    immobilier: statusCounts[status]?.immobilier ?? 0,
    cleaning: statusCounts[status]?.cleaning ?? 0,
    total:
      (statusCounts[status]?.immobilier ?? 0) +
      (statusCounts[status]?.cleaning ?? 0),
  }));

  const last7Days = Array.from(map7Days.values());
  const last30Days = Array.from(map30Days.values());
  const last6Months = Array.from(map6Months.values());

  const totalDemandes = requests.length;
  const tauxTraitement =
    totalDemandes > 0
      ? Math.round((demandesTraitees / totalDemandes) * 100)
      : 0;

  return {
    totalDemandes,
    demandesImmobilier,
    demandesCleaning,
    demandesEnAttente,
    demandesTraitees,
    tauxTraitement,
    byStatus,
    last7Days,
    last30Days,
    last6Months,
    totalBiens: properties.length,
    totalCleaningServices: cleaningCount,
  };
}
