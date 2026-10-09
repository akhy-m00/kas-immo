import { NextResponse } from "next/server";

import type { UserRole } from "@/lib/supabase/database.types";
import { homeForRole } from "@/lib/supabase/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * Retour de la connexion OAuth Google.
 *
 * Tel que documenté pour le flux PKCE, ce retour porte un paramètre
 * `?code=...` : c'est ce code qu'il faut échanger contre une session via
 * `exchangeCodeForSession`. Le fragment OAuth « implicit » (contrairement à
 * PKCE) n'est pas traité ici, et ne doit pas l'être : c'est le code, jamais
 * le jeton, qui transite par l'URL.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requested = safeNext(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/connexion?erreur=google`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/connexion?erreur=google`);
  }

  // Un admin qui arrive par Google doit atterrir sur son tableau de bord, pas
  // sur l'espace client. Le rôle est relu après l'échange du code, donc la
  // session existe déjà et la RLS de `profiles` autorise la lecture.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  let role: UserRole = "client";
  if (claims?.sub) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", claims.sub)
      .maybeSingle();
    role = profile?.role ?? "client";
  }

  // La destination dépend du rôle, sauf si un `?next=` explicite a été demandé.
  const destination = requested ?? homeForRole(role);

  return NextResponse.redirect(`${origin}${destination}`);
}

/**
 * N'accepte qu'un chemin interne commençant par `/`.
 *
 * Sans cette vérification, `?next=https://site-pirate.com` transformerait le
 * callback en redirection ouverte, exploitable pour du phishing après une
 * connexion légitime.
 */
function safeNext(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}
