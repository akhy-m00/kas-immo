import { NextResponse } from "next/server";

import { cheminInterneSur } from "@/lib/safe-redirect";
import { siteConfig } from "@/lib/site";
import type { UserRole } from "@/lib/supabase/database.types";
import { homeForRole } from "@/lib/supabase/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * Retour du lien de réinitialisation du mot de passe (e-mail).
 *
 * La connexion Google a été retirée ; cette route reste indispensable au lien
 * de réinitialisation, qui revient ici avec un `?code=`.
 *
 * Tel que documenté pour le flux PKCE, ce retour porte un paramètre
 * `?code=...` : c'est ce code qu'il faut échanger contre une session via
 * `exchangeCodeForSession`. Le fragment OAuth « implicit » (contrairement à
 * PKCE) n'est pas traité ici, et ne doit pas l'être : c'est le code, jamais
 * le jeton, qui transite par l'URL.
 *
 * ⚠️ Les redirections visent `siteConfig.url` (NEXT_PUBLIC_SITE_URL), jamais
 * l'origine de `request.url` : derrière le reverse proxy de production, Next
 * reçoit la requête sur `http://localhost:3000`, et l'utilisateur serait
 * renvoyé vers sa propre machine après la connexion.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  // `suite` est le nom utilisé partout sur le site (gardes de page, lien de
  // réinitialisation). `next` reste lu pour les liens déjà envoyés.
  const requested = cheminInterneSur(
    searchParams.get("suite") ?? searchParams.get("next"),
  );

  if (!code) {
    return redirectTo("/connexion?erreur=lien");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectTo("/connexion?erreur=lien");
  }

  // Sans `?suite=`, un admin doit atterrir sur son tableau de bord, pas sur
  // l'espace client. Le rôle est relu après l'échange du code, donc la
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

  // La destination dépend du rôle, sauf si un `?suite=` explicite a été demandé.
  return redirectTo(requested ?? homeForRole(role));
}

/** Redirection vers un chemin interne, sur l'URL publique du site. */
function redirectTo(chemin: string) {
  return NextResponse.redirect(`${siteConfig.url}${chemin}`);
}
