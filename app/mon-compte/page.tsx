import type { Metadata } from "next";

import { SectionBadge } from "@/components/SectionBadge";
import { AccessNotice } from "@/components/auth/access-notice";
import { UserMenu } from "@/components/auth/user-menu";
import { listerMesDemandes } from "@/lib/requests-public";
import { formaterTelephoneSenegalais } from "@/lib/phone";
import { immobilierLogo } from "@/lib/site";
import { requireUser } from "@/lib/supabase/auth";
import { DemandesList } from "./demandes-list";

export const metadata: Metadata = {
  title: "Mon compte",
  description: "Votre espace client Keur Anta Services.",
};

const NOTICES: Record<string, string> = {
  "acces-restreint": "Accès réservé à l'administration.",
};

export default async function MonComptePage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  // Garde de page : sans session, `requireUser` redirige vers /connexion et
  // cette page n'est jamais rendue.
  const user = await requireUser("/mon-compte");

  // Message de redirection posé par la garde `/admin` quand un client tente
  // d'y accéder. Lu ici côté serveur : cette page est déjà dynamique, donc le
  // message arrive dans le HTML, sans JavaScript supplémentaire.
  const { erreur } = await searchParams;
  const notice = erreur ? NOTICES[erreur] : undefined;

  // La RLS de `requests` ne renvoie à un utilisateur que ses propres lignes :
  // la liste est donc déjà la sienne, sans aucun filtre appliqué ici.
  const demandes = await listerMesDemandes();

  return (
    <div>
      <section className="border-b border-border bg-muted">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <SectionBadge
            logo={immobilierLogo}
            titre="Mon compte"
            sousTitre="Espace client"
            surface="carte"
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto w-full max-w-md">
          {notice ? <AccessNotice message={notice} /> : null}

          <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground sm:p-8">
            <p className="text-sm text-muted-foreground">
              Bienvenue{" "}
              <span className="font-semibold text-foreground">
                {user.fullName}
              </span>
            </p>

            <dl className="mt-6 flex flex-col gap-4 text-sm">
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground">Nom</dt>
                <dd className="font-medium break-words">{user.fullName}</dd>
              </div>
              {user.phone ? (
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Téléphone</dt>
                  <dd className="font-medium break-words">
                    {formaterTelephoneSenegalais(user.phone)}
                  </dd>
                </div>
              ) : null}
              {/* L'e-mail n'est affiché que s'il existe RÉELLEMENT : un compte créé
                  avec un numéro est enregistré sous une adresse technique interne
                  (`771234567@compte.invalid`), que `getCurrentUser()` a déjà
                  remplacée par une chaîne vide via `estEmailTechniqueInterne()`.
                  Le test ci-dessous porte donc sur l'absence d'e-mail, jamais sur
                  son contenu : afficher cette ligne pour un compte téléphone
                  montrerait une adresse inexistante. Les comptes Google et les
                  anciens comptes e-mail continuent de voir la leur, sans aucune
                  modification de leurs données. */}
              {user.email ? (
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Adresse e-mail</dt>
                  <dd className="font-medium break-words">{user.email}</dd>
                </div>
              ) : null}
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground">Type de compte</dt>
                <dd className="font-medium">
                  {user.role === "admin" ? "Administrateur" : "Client"}
                </dd>
              </div>
            </dl>

            <div className="mt-7">
              <UserMenu variant="inline" />
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              Les biens enregistrés en favori apparaîtront ici.
            </p>
          </div>
        </div>
      </section>

      {/* Le suivi des demandes est hors de la carte d'identité : une liste
          potentiellement longue n'a pas sa place dans une colonne étroite,
          et le demandeur la consulte sur son téléphone. */}
      <section className="mx-auto w-full max-w-4xl px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8">
        <h2 className="font-heading text-xl font-bold text-foreground sm:text-2xl">
          Mes demandes
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {demandes.length > 0
            ? `${demandes.length} demande${demandes.length > 1 ? "s" : ""} envoyée${demandes.length > 1 ? "s" : ""}. Notre équipe vous rappelle pour confirmer le créneau.`
            : "Vous n'avez pas encore envoyé de demande de visite."}
        </p>

        <div className="mt-6">
          <DemandesList demandes={demandes} />
        </div>
      </section>
    </div>
  );
}
