"use server";

import { revalidatePath } from "next/cache";

import { estUuid } from "@/lib/ids";
import { deleteRequest, updateRequestStatus } from "@/lib/requests-admin";
import { STATUS_VALUES } from "@/lib/requests";
import type { RequestStatus } from "@/lib/supabase/database.types";
import { requireAdmin } from "@/lib/supabase/auth";

/**
 * Écritures de la section « Demandes reçues ».
 *
 * ⚠️ `app/admin/layout.tsx` protège les PAGES, pas les Server Actions : une
 * action est une route HTTP publique, atteignable sans passer par un rendu de
 * page. Chaque fonction rappelle donc `requireAdmin()` avant toute écriture.
 * C'est cette garde — et non le layout — qui fait la sécurité ici ; les
 * politiques RLS restent la seconde barrière, appliquée par le client de la
 * session.
 */

/** Résultat d'une action déclenchée depuis un bouton, pas un formulaire. */
export type RequestActionResult = { ok: true } | { ok: false; error: string };

/**
 * Identifiant absent ou mal formé, à distinguer d'une demande absente.
 *
 * « Cette demande est introuvable » était appliqué dans les deux cas : le garde
 * rejetait un UUID mal transmis tout en annonçant une ligne disparue. Sur une
 * base où la demande existe, l'administrateur lisait un faux diagnostic et ne
 * pouvait pas deviner que la requête n'était jamais partie. D'où ces deux
 * messages distincts.
 */
const IDENTIFIANTE_INVALIDE =
  "Identifiant de demande invalide : la mise à jour n'a pas été envoyée.";

/**
 * Invalide les pages dont l'affichage dépend du statut d'une demande.
 *
 * `/admin/demandes` porte la liste, `/admin` son compteur de « En attente », et
 * `/mon-compte` la liste des demandes du demandeur : sans cet appel, un
 * changement de statut mettrait jusqu'à le prochain rafraîchissement à
 * apparaître chez le demandeur.
 */
function revalidatePagesLiees() {
  revalidatePath("/admin/demandes");
  revalidatePath("/admin");
  revalidatePath("/mon-compte");
}

/**
 * Change le statut d'une demande.
 *
 * Le statut est validé ici, et pas seulement dans le formulaire : l'action
 * reçoit ses arguments d'une requête HTTP, et une valeur hors de l'enum ferait
 * échouer la requête en base avec un message incompréhensible.
 */
export async function updateRequestStatusAction(
  requestId: string,
  status: string,
): Promise<RequestActionResult> {
  await requireAdmin();

  if (!estUuid(requestId)) {
    return { ok: false, error: IDENTIFIANTE_INVALIDE };
  }

  if (!(STATUS_VALUES as readonly string[]).includes(status)) {
    return { ok: false, error: "Ce statut est inconnu." };
  }

  const resultat = await updateRequestStatus(
    requestId,
    status as RequestStatus,
  );

  if (!resultat.ok) return { ok: false, error: resultat.error };

  revalidatePagesLiees();

  return { ok: true };
}

/** Supprime définitivement une demande. */
export async function deleteRequestAction(
  requestId: string,
): Promise<RequestActionResult> {
  await requireAdmin();

  if (!estUuid(requestId)) {
    return { ok: false, error: IDENTIFIANTE_INVALIDE };
  }

  const resultat = await deleteRequest(requestId);

  if (!resultat.ok) return { ok: false, error: resultat.error };

  revalidatePagesLiees();

  return { ok: true };
}
