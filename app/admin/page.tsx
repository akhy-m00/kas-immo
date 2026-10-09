import Link from "next/link";
import { Building2, ClipboardList, Inbox, Sparkles } from "lucide-react";

import { AdminPageHeader, adminMetadata } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { getAdminStats } from "@/lib/properties-admin";
import { PROPERTY_STATUS_LABELS } from "@/lib/properties";
import type { PropertyStatus } from "@/lib/supabase/database.types";

export const metadata = adminMetadata(
  "Tableau de bord admin",
  "Pilotage des biens immobiliers et des demandes reçues.",
);

/**
 * Tableau de bord de l'administration.
 *
 * La garde de rôle vit dans `app/admin/layout.tsx` et couvre toute la section
 * `/admin` : cette page n'a donc pas à la rappeler. Les compteurs sont lus avec
 * le client de la session, donc la RLS s'applique — un client connecté ne peut
 * pas atteindre cette page de toute façon.
 */
export default async function AdminPage() {
  const stats = await getAdminStats();

  const parStatut = (
    Object.keys(PROPERTY_STATUS_LABELS) as PropertyStatus[]
  ).map((statut) => ({
    statut,
    label: PROPERTY_STATUS_LABELS[statut],
    total: stats.parStatut[statut],
  }));

  return (
    <div>
      <AdminPageHeader
        titre="Tableau de bord"
        sousTitre="Espace administrateur"
        chemin="/admin"
        description="Vue d'ensemble du portefeuille immobilier et des demandes reçues."
        actions={
          <Button asChild size="lg">
            <Link href="/admin/biens/nouveau">
              <Building2 aria-hidden="true" />
              Ajouter un bien
            </Link>
          </Button>
        }
      />

      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CarteStat
            libelle="Biens au total"
            valeur={stats.total}
            detail="Toutes transactions confondues"
          />

          {parStatut.map(({ statut, label, total }) => (
            <CarteStat
              key={statut}
              libelle={label}
              valeur={total}
              variante={statut}
              href={`/admin/biens?statut=${statut}`}
              detail="Voir ces biens"
            />
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <CarteStat
            libelle="Demandes à traiter"
            valeur={stats.demandesNouvelles}
            variante="demandes"
            href="/admin/demandes?statut=nouveau"
            detail="Voir les demandes « En attente »"
          />
        </div>

        <h2 className="mt-12 text-lg font-semibold text-foreground">
          Raccourcis
        </h2>

        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          <Raccourci
            href="/admin/biens"
            icon={<Building2 aria-hidden="true" className="size-5" />}
            titre="Gérer les biens"
            description="Créer, modifier et supprimer les annonces, avec leurs photos."
          />
          <Raccourci
            href="/admin/cleaning"
            icon={<Sparkles aria-hidden="true" className="size-5" />}
            titre="Gérer le cleaning"
            description="Prestations de nettoyage : bientôt disponible."
          />
          <Raccourci
            href="/admin/demandes"
            icon={<Inbox aria-hidden="true" className="size-5" />}
            titre="Demandes reçues"
            description="Visites et devis : bientôt disponible."
          />
        </ul>
      </section>
    </div>
  );
}

const VARIANTES = {
  disponible:
    "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  loue: "border-amber-600/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  vendu: "border-border bg-muted text-muted-foreground",
  demandes:
    "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300",
} as const;

type Variante = keyof typeof VARIANTES;

function CarteStat({
  libelle,
  valeur,
  detail,
  variante,
  href,
}: {
  libelle: string;
  valeur: number;
  detail: string;
  variante?: Variante;
  href?: string;
}) {
  const corps = (
    <>
      <p className="text-sm font-medium text-muted-foreground">{libelle}</p>
      <p className="mt-2 font-heading text-4xl font-bold tabular-nums text-foreground">
        {valeur.toLocaleString("fr-FR")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </>
  );

  const classes = `rounded-2xl border p-5 ${
    variante ? VARIANTES[variante] : "border-border bg-card"
  }`;

  if (!href) {
    return <div className={classes}>{corps}</div>;
  }

  return (
    <Link
      href={href}
      className={`${classes} block transition-transform duration-200 hover:-translate-y-0.5`}
    >
      {corps}
    </Link>
  );
}

function Raccourci({
  href,
  icon,
  titre,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  titre: string;
  description: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex h-full flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-brand-text/40 hover:bg-muted"
      >
        <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand-text">
          {icon}
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-foreground">
          {titre}
          <ClipboardList
            aria-hidden="true"
            className="size-3.5 text-muted-foreground"
          />
        </span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </Link>
    </li>
  );
}
