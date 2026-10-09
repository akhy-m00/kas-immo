import Link from "next/link";
import { Building2, CheckCircle2 } from "lucide-react";

import {
  AdminNotice,
  AdminPageHeader,
  adminMetadata,
} from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { BiensList } from "./biens-list";
import { FiltresBiens } from "./filtres";
import { countProperties, listProperties } from "@/lib/properties-admin";

export const metadata = adminMetadata(
  "Biens immobiliers",
  "Gestion des annonces immobilières : création, modification et suppression.",
);

/** Messages affichés après une redirection depuis le formulaire. */
const SUCCES = {
  "bien-cree": "Le bien a été créé.",
  "bien-modifie": "Les modifications ont été enregistrées.",
} as const;

export default async function AdminBiensPage({
  searchParams,
}: {
  searchParams: Promise<{
    statut?: string;
    type?: string;
    transaction?: string;
    recherche?: string;
    succes?: string;
  }>;
}) {
  const params = await searchParams;

  const filtres = {
    statut: params.statut ?? "",
    type: params.type ?? "",
    transaction: params.transaction ?? "",
    recherche: params.recherche ?? "",
  };

  const filtreActif = Object.values(filtres).some(Boolean);

  // Les filtres sont appliqués par la base, pas en JavaScript. Le total sans
  // filtre n'est demandé que lorsqu'un filtre est actif : il permet de
  // distinguer « aucun bien au catalogue » de « aucun résultat pour ces
  // critères », sans coûter une requête de plus dans le cas courant.
  const biens = await listProperties(filtres);
  const total = filtreActif ? await countProperties() : biens.length;

  const succes = params.succes
    ? SUCCES[params.succes as keyof typeof SUCCES]
    : undefined;

  return (
    <div>
      <AdminPageHeader
        titre="Biens immobiliers"
        sousTitre="Espace administrateur"
        chemin="/admin/biens"
        description={`${total} bien${total > 1 ? "s" : ""} au catalogue.`}
        actions={
          <Button asChild size="lg">
            <Link href="/admin/biens/nouveau">
              <Building2 aria-hidden="true" />
              Ajouter un bien
            </Link>
          </Button>
        }
      />

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {succes ? (
          <div className="mb-6">
            <AdminNotice ton="succes">
              <span className="flex items-center gap-2">
                <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
                {succes}
              </span>
            </AdminNotice>
          </div>
        ) : null}

        <FiltresBiens {...filtres} actif={filtreActif} />

        <div className="mt-8">
          <BiensList biens={biens} total={total} />
        </div>
      </section>
    </div>
  );
}
