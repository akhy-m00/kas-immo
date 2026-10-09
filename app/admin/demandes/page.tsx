import { Inbox } from "lucide-react";

import {
  AdminPageHeader,
  adminMetadata,
} from "@/components/admin/admin-page";
import { countRequests, listRequests, parseRequestFilters } from "@/lib/requests-admin";
import { DemandesList } from "./demandes-list";
import { FiltresDemandes } from "./filtres";

export const metadata = adminMetadata(
  "Demandes reçues",
  "Visites de biens et demandes de rendez-vous Cleaning reçues par le site.",
);

/**
 * File des demandes reçues.
 *
 * La liste est lue par le serveur, à chaque visite : c'est ce qui permet aux
 * filtres de vivre dans l'URL et à la page d'être réellement partageable. Aucun
 * état de tri n'est conservé côté client, et le compte de « En attente » du
 * tableau de bord pointe ici avec `?statut=nouveau`.
 *
 * Le compteur de la page est le nombre de demandes correspondant aux filtres,
 * et non le total de la table : annoncer « 2 demandes » sur un écran qui en
 * affiche 12 serait trompeur. Le total n'est relu que pour distinguer une file
 * vide d'une liste filtrée sans résultat.
 */
type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminDemandesPage({ searchParams }: PageProps) {
  const filtres = parseRequestFilters(await searchParams);

  const demandes = await listRequests(filtres);

  const filtreActif = Boolean(
    filtres.statut || filtres.type || filtres.recherche,
  );

  // Le total n'est demandé que lorsqu'un filtre est actif : dans le cas
  // courant, `demandes.length` suffit et on économise une requête.
  const total = filtreActif ? await countRequests() : demandes.length;

  return (
    <div>
      <AdminPageHeader
        titre="Demandes reçues"
        sousTitre="Espace administrateur"
        chemin="/admin/demandes"
        description={
          filtreActif
            ? `${demandes.length} demande${demandes.length > 1 ? "s" : ""} pour ces critères, sur ${total} au total.`
            : `${demandes.length} demande${demandes.length > 1 ? "s" : ""} au total.`
        }
      />

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mb-6">
          <FiltresDemandes
            statut={filtres.statut ?? ""}
            type={filtres.type ?? ""}
            recherche={filtres.recherche ?? ""}
            actif={filtreActif}
          />
        </div>

        {filtreActif ? (
          <p className="mb-6 flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-3 text-sm font-medium text-foreground">
            <Inbox aria-hidden="true" className="size-4 shrink-0" />
            Filtres appliqués. Une demande qui n’y correspond pas reste visible
            une fois les filtres réinitialisés.
          </p>
        ) : null}

        <DemandesList
          demandes={demandes}
          total={total}
          filtreActif={filtreActif}
        />
      </section>
    </div>
  );
}