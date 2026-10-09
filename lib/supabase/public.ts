import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

/** Durée de vie du cache des requêtes catalogue, en secondes. */
const REVALIDATION_CATALOGUE_SECONDES = 300;

/**
 * Client Supabase pour la lecture publique des biens, côté serveur.
 *
 * Différence essentielle avec `lib/supabase/server.ts` : ce client ne touche
 * PAS aux cookies. Il n'a donc aucune session et sert la clé publiable seule,
 * ce qui a deux conséquences voulues :
 *
 *  - les requêtes passent par la RLS en rôle `anon`, donc seules les lignes
 *    réellement publiques sont lisibles. C'est une garantie de sécurité, pas
 *    une commodité : la clé secrète n'est jamais utilisée ici.
 *  - les pages qui l'utilisent peuvent rester **statiques avec revalidation**
 *    (ISR). `cookies()` étant une API Request-time, son simple appel ferait
 *    basculer `/` et `/immobilier` en rendu dynamique à chaque requête, et
 *    elles sont justement les deux pages les plus visitées.
 *
 * La fraîcheur du catalogue est pilotée par `revalidatePath` du côté admin,
 * plutôt que par un cache HTTP dont l'expiration serait imprévisible. Concrètement
 * la requête est **mise en cache** pendant `REVALIDATION_CATALOGUE_SECONDES`,
 * ce qui remplit deux conditions à la fois :
 *
 *  - la page peut être prérendue au build, sans appel à Supabase à chaque
 *    requête ;
 *  - elle reste à jour : `revalidatePath` du côté admin purge l'entrée, et
 *    l'attente maximale de cinq minutes n'est qu'un filet de sécurité si une
 *    écriture passe par un autre chemin.
 *
 * `cache: "no-store"` aurait l'effet inverse : Next refuse alors de prérendre
 * la route et bascule `/` et `/immobilier` en rendu dynamique à chaque visite.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    supabaseUrl(),
    supabasePublishableKey(),
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            next: { revalidate: REVALIDATION_CATALOGUE_SECONDES },
          }),
      },
    },
  );
}
