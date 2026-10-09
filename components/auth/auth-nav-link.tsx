"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Menu utilisateur, chargé à la demande.
 *
 * Le client Supabase pèse environ 250 Ko non compressés. L'importer
 * statiquement l'ajouterait au JavaScript initial de *toutes* les pages, pour
 * un menu qui ne sert qu'après la lecture de la session. `next/dynamic` le sort
 * du chargement initial : le chunk est téléchargé après l'hydratation, une fois
 * le contenu affiché.
 */
const UserMenu = dynamic(
  () => import("@/components/auth/user-menu").then((m) => m.UserMenu),
  { ssr: false, loading: () => <AuthPlaceholder width="button" /> },
);

/**
 * Emplacement réservé pendant la lecture de la session.
 *
 * Reprend exactement les dimensions du bouton « Connexion » : quand le bouton
 * ou le menu utilisateur le remplace, la mise en page ne bouge pas.
 */
export function AuthPlaceholder({
  className,
  width = "button",
}: {
  className?: string;
  width?: "button" | "block";
}) {
  return (
    <div className={className} aria-hidden="true">
      <span
        className={width === "block" ? "block h-12 w-full" : "block h-11 w-24"}
      />
    </div>
  );
}

/**
 * Emplacement du bouton de connexion dans le header.
 *
 * Tant que la session n'est pas lue, un emplacement de la taille exacte du
 * bouton est rendu : ni clignotement, ni décalage de mise en page.
 */
export function AuthNavLink({
  className,
  width = "button",
}: {
  className?: string;
  width?: "button" | "block";
}) {
  const [session, setSession] = useState<{
    fullName: string;
    role: "client" | "admin";
  } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    // Import dynamique pour la même raison que ci-dessus : sans cela, le
    // client Supabase entrerait dans le bundle initial de toutes les pages.
    void import("@/lib/supabase/browser-session").then(({ getClientSession }) =>
      getClientSession().then((result) => {
        if (!active) return;
        setSession(result);
        setLoaded(true);
      }),
    );

    return () => {
      active = false;
    };
  }, []);

  if (!loaded) {
    return <AuthPlaceholder className={className} width={width} />;
  }

  if (!session) {
    return (
      <div className={className}>
        <Button
          asChild
          size="lg"
          className={width === "block" ? "h-12 w-full text-base" : "h-11 px-5"}
        >
          <Link href="/connexion">Connexion</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <UserMenu width={width} />
    </div>
  );
}
