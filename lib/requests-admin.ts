import type {
  CleaningService,
  Property,
  Request,
  RequestStatus,
  RequestType,
} from "@/lib/supabase/database.types";
import { STATUS_VALUES, type RequestWithProperty } from "@/lib/requests";
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
