import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "./database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Client Supabase pour le serveur (Server Components, Server Actions,
 * Route Handlers).
 *
 * À appeler dans une fonction `async`. Un nouveau client est créé à chaque
 * appel : c'est volontaire, chaque requête HTTP a ses propres cookies.
 *
 * ⚠️ `cookies()` est une API Request-time : l'utiliser dans une page ou un
 * layout fait basculer la route en rendu dynamique. Les pages statiques
 * actuelles du site n'utilisent pas ce module, elles restent prérendues.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Les Server Components ne peuvent pas écrire de cookies : l'appel
          // est ignoré ici. Le rafraîchissement réel est fait par
          // `proxy.ts`, qui s'exécute avant le rendu et porte les bons
          // cookies.
        }
      },
    },
  });
}
