import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Client Supabase pour le navigateur (Client Components).
 *
 * `createBrowserClient` gère lui-même le singleton : l'appeler plusieurs
 * fois retourne toujours la même instance, il n'y a donc pas de risque de
 * dupliquer la connexion. La session est stockée dans un cookie lisible par
 * le serveur, ce qui permet au rendu serveur de connaître l'utilisateur.
 */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabasePublishableKey());
}
