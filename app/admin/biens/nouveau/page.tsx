import { AdminPageHeader, adminMetadata } from "@/components/admin/admin-page";
import { PropertyForm } from "../property-form";

export const metadata = adminMetadata(
  "Nouveau bien",
  "Création d'une annonce immobilière.",
);

/**
 * Création d'un bien.
 *
 * Le formulaire est identique à celui de `/admin/biens/[id]` : le même
 * composant reçoit `null` au lieu d'un bien, et sa valeur `status` par défaut
 * est « disponible ».
 */
export default function AdminNouveauBienPage() {
  return (
    <div>
      <AdminPageHeader
        titre="Nouveau bien"
        sousTitre="Espace administrateur"
        chemin="/admin/biens"
        description="Renseignez l'annonce et ajoutez ses photos. Tout est modifiable ensuite."
      />

      <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <PropertyForm bien={null} />
      </section>
    </div>
  );
}
