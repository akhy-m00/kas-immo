import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/supabase/database.types";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Proxy (ex-`middleware`) Next.js — rafraîchit la session Supabase.
 *
 * Next.js 16 a renommé la convention `middleware` en `proxy` : le fichier
 * s'appelle `proxy.ts` et la fonction exportée `proxy`. Le code Supabase est
 * identique à celui de l'ancienne version.
 *
 * Pourquoi c'est nécessaire : un Server Component ne peut pas écrire de
 * cookies. Sans ce proxy, un jeton expiré ne serait jamais renouvelé et
 * l'utilisateur serait déconnecté tout seul au bout d'une heure. Le proxy
 * s'exécute avant le rendu, rafraîchit le jeton, puis le transmet à la fois
 * à la requête (`request.cookies.set`) et à la réponse
 * (`supabaseResponse.cookies.set`).
 *
 * `getClaims()` est utilisé plutôt que `getSession()` : il vérifie la
 * signature du jeton, alors que `getSession()` se contente de lire le cookie,
 * que le client peut forger.
 *
 * On renvoie `supabaseResponse`, la réponse construite en dernier par
 * `setAll` : une réponse antérieure ne porterait pas les cookies
 * rafraîchisssés, et l'utilisateur serait déconnecté à la requête suivante.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    supabaseUrl(),
    supabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // L'appel sert uniquement à déclencher un éventuel renouvellement. Le jeton
  // est ensuite relu par `getCurrentUser` dans les pages qui en ont besoin.
  await supabase.auth.getClaims();

  return supabaseResponse;
}

export const config = {
  /**
   * Le proxy ne s'exécute que sur les routes qui manipulent des cookies.
   * Les fichiers statiques, les images optimisées et les sources de carte
   * sont exclus : ils n'ont pas de session à rafraîchir.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
