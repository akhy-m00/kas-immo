import type {
  CleaningService,
  CleaningType,
  Property,
  Request,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import {
  CLEANING_TYPE_VALUES,
  type RequestWithProperty,
} from "@/lib/requests";

/**
 * Écriture et lecture « demandeur » des demandes, côté serveur.
 *
 * ⚠️ Toutes les opérations passent par `createClient()`, c'est-à-dire par le
 * client de la session : avec ou sans cookie, il n'existe donc jamais de clé de
 * service ici. C'est ce qui fait que les politiques RLS s'appliquent
 * réellement — la seule barrière qui protège les demandes des autres
 * utilisateurs.
 *
 * Séparé de `lib/requests-admin.ts`, qui lit tout : un demandeur ne doit pas
 * disposer d'une fonction capable de ramener toutes les demandes.
 */

/** Le bien tel que renvoyé par la jointure PostgREST. */
type BienJoint = Pick<Property, "id" | "title" | "location" | "status">;

/** La prestation cleaning telle que renvoyée par la jointure PostgREST. */
type PrestationJoint = Pick<CleaningService, "id" | "title" | "image_url">;

/**
 * Sélecteur d'une demande avec son objet.
 *
 * La jointure `properties (...)` est faite par PostgREST via la clé étrangère
 * `requests_property_id_fkey`. Elle renvoie `null` — et non une ligne vide —
 * quand le bien a été supprimé : `property_id` est en ON DELETE SET NULL.
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
 * Message d'erreur renvoyé au demandeur.
 *
 * `cleEtrangere` est le texte à afficher quand la clé étrangère est violée :
 * il diffère selon l'objet demandé, car « ce bien n'est plus disponible » ne
 * veut rien dire pour une prestation Cleaning.
 */
function erreurMessage(
  error: { code?: string; message?: string } | null,
  defaut: string,
  cleEtrangere?: string,
): string {
  if (!error) return defaut;

  // RLS : une écriture refusée ne produit pas toujours un message exploitable,
  // et le détail technique n'aide pas le visiteur.
  if (error.code === "42501") {
    return "Votre demande n'a pas pu être enregistrée. Réessayez dans un instant.";
  }

  // Clé étrangère : l'objet a été supprimé entre l'affichage de la page et
  // l'envoi du formulaire.
  if (error.code === "23503") {
    return cleEtrangere ?? "Ce bien n'est plus disponible. Consultez la liste des biens à jour.";
  }

  return defaut;
}

/** Résultat d'un dépôt de demande. */
export type DemandeResultat = { ok: true } | { ok: false; error: string };

/**
 * Enregistre une demande de visite.
 *
 * Le bien est vérifié AVANT l'insertion : sans cette lecture, un identifiant
 * forgé produirait une erreur de clé étrangère illisible, et surtout le cas
 * courant d'un bien supprimé entre-temps mériterait un message clair.
 *
 * `user_id` vient de la session, jamais du formulaire. La politique RLS
 * l'impose de toute façon — un visiteur non connecté doit envoyer `null`, un
 * client connecté son propre `auth.uid()` — mais le rôle de l'application est
 * de ne jamais fabriquer une valeur que la base va refuser.
 */
export async function creerDemandeVisite(
  input: {
    fullName: string;
    phone: string;
    desiredDate: string | null;
    desiredTime: string | null;
    message: string | null;
  },
  propertyId: string,
): Promise<DemandeResultat> {
  const supabase = await createClient();

  const bien = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .maybeSingle();

  if (bien.error) {
    return {
      ok: false,
      error: erreurMessage(
        bien.error,
        "Ce bien est momentanément injoignable.",
      ),
    };
  }

  if (!bien.data) {
    return {
      ok: false,
      error: "Ce bien n'est plus disponible. Consultez la liste des biens à jour.",
    };
  }

  // `getClaims()` et non `getSession()` : il vérifie la signature du jeton.
  // Un visiteur non connecté obtient `null`, ce qui est la valeur attendue.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ?? null;

  /**
   * Pas de `.select()` après l'insertion, volontairement.
   *
   * La politique de lecture de `requests` ne s'applique qu'au rôle
   * `authenticated` : un visiteur non connecté ne peut relire aucune ligne,
   * y compris celle qu'il vient d'écrire. Une lecture après écriture lui
   * renverrait donc `null` sans erreur, et le formulaire afficherait un échec
   * alors que la demande est enregistrée.
   *
   * L'absence d'erreur suffit : sur un INSERT, une politique refusée produit
   * bien une erreur, contrairement à un UPDATE ou un DELETE neutralisés par la
   * RLS, qui renvoient silencieusement zéro ligne.
   */
  const { error } = await supabase.from("requests").insert({
    user_id: userId,
    type: "visite_bien",
    property_id: propertyId,
    full_name: input.fullName,
    phone: input.phone,
    message: input.message,
    desired_date: input.desiredDate,
    desired_time: input.desiredTime,
    status: "nouveau",
  });

  if (error) {
    return {
      ok: false,
      error: erreurMessage(
        error,
        "Votre demande n'a pas pu être enregistrée. Réessayez dans un instant.",
      ),
    };
  }

  return { ok: true };
}

/**
 * Enregistre une demande de rendez-vous Cleaning.
 *
 * Même architecture de sécurité que `creerDemandeVisite()`, transposée au
 * Cleaning. Le formulaire ne fournit que l'identité du demandeur, le type de
 * nettoyage et le créneau ; tout le reste est posé ici, jamais reçu du client :
 *
 * - `type` vaut `devis_cleaning`. La valeur technique n'a pas changé : c'est une
 *   DEMANDE, pas une réservation confirmée, et l'administration reste maîtresse
 *   du moment où elle devient une confirmation ;
 * - `status` vaut `nouveau`. Un statut choisi par le navigateur permettrait à un
 *   visiteur de s'attribuer une demande « Acceptée » sans être traité ;
 * - `property_id` et `cleaning_service_id` valent `null`. Un nettoyage ne porte
 *   ni sur un bien du parc immobilier, ni sur une prestation de catalogue ;
 * - `user_id` vient de la session, jamais du formulaire — `null` pour un
 *   visiteur non connecté, ce qu'exige la politique RLS d'insertion.
 *
 * `cleaning_type` a été validé par `parseCleaningQuoteForm()`, mais la liste des
 * valeurs est recontrôlée ici avant l'écriture : la contrainte CHECK de la base
 * reste ainsi le seul juge, et une divergence entre la validation applicative et
 * cette contrainte ne pourrait pas passer silencieusement.
 */
export async function creerDemandeDevisCleaning(input: {
  fullName: string;
  phone: string;
  message: string | null;
  cleaningType: CleaningType;
  desiredDate: string;
  desiredTime: string;
}): Promise<DemandeResultat> {
  if (!CLEANING_TYPE_VALUES.includes(input.cleaningType)) {
    return {
      ok: false,
      error: "Choisissez un type de nettoyage proposé.",
    };
  }

  const supabase = await createClient();

  // `getClaims()` et non `getSession()` : il vérifie la signature du jeton.
  // Un visiteur non connecté obtient `null`, ce qui est la valeur attendue.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ?? null;

  /**
   * Pas de `.select()` après l'insertion, pour la même raison que dans
   * `creerDemandeVisite()` : la politique de lecture de `requests` est réservée
   * au rôle `authenticated`, donc un visiteur anonyme ne peut pas relire sa
   * propre ligne et verrait un échec alors qu'elle est enregistrée. L'absence
   * d'erreur suffit : sur un INSERT, une politique refusée produit bien une
   * erreur.
   */
  const { error } = await supabase.from("requests").insert({
    user_id: userId,
    type: "devis_cleaning",
    property_id: null,
    cleaning_service_id: null,
    cleaning_type: input.cleaningType,
    full_name: input.fullName,
    phone: input.phone,
    message: input.message,
    desired_date: input.desiredDate,
    desired_time: input.desiredTime,
    status: "nouveau",
  });

  if (error) {
    return {
      ok: false,
      error: erreurMessage(
        error,
        "Votre demande n'a pas pu être enregistrée. Réessayez dans un instant.",
      ),
    };
  }

  return { ok: true };
}

/**
 * Les demandes de l'utilisateur connecté, de la plus récente à la plus
 * ancienne.
 *
 * Aucun filtre n'est appliqué sur `user_id` : la politique RLS limite déjà la
 * lecture aux propres lignes de l'utilisateur, et un filtre applicatif
 * redoublerait cette règle sans rien sécuriser de plus. Le tri par date, en
 * revanche, reste une exigence d'affichage.
 *
 * La limite de 50 lignes évite qu'un compte très actif ne surcharge le rendu
 * de `/mon-compte`, qui affiche aussi le reste du compte.
 */
export async function listerMesDemandes(): Promise<RequestWithProperty[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("requests")
    .select(REQUEST_SELECT)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(
      erreurMessage(error, "Vos demandes sont momentanément injoignables."),
    );
  }

  return (data ?? []).map((row) => versDemande(row as RequestRow));
}
