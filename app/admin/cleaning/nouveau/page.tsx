import { AdminPageHeader, adminMetadata } from "@/components/admin/admin-page";
import { ServiceForm } from "../service-form";

export const metadata = adminMetadata(
  "Nouveau service",
  "Création d'une prestation de nettoyage.",
);

/**
 * Création d'un service de cleaning.
 *
 * Le formulaire est identique à celui de `/admin/cleaning/[id]` : le même
 * composant reçoit `null` au lieu d'un service, et affiche alors les libellés
 * de création plutôt que de modification.
 */
export default function AdminNouveauCleaningPage() {
  return (
    <div>
      <AdminPageHeader
        titre="Nouveau service"
        sousTitre="Espace administrateur"
        chemin="/admin/cleaning"
        description="Décrivez la prestation et ajoutez sa photo. Tout reste modifiable ensuite."
      />

      <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <ServiceForm service={null} />
      </section>
    </div>
  );
}
