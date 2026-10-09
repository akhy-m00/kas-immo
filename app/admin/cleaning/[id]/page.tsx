import { notFound } from "next/navigation";

import { AdminPageHeader, adminMetadata } from "@/components/admin/admin-page";
import { ServiceForm } from "../service-form";
import { findCleaningService } from "@/lib/cleaning-admin";

export const metadata = adminMetadata(
  "Modifier un service",
  "Modification d'une prestation de nettoyage.",
);

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminModifierCleaningPage({ params }: PageProps) {
  const { id } = await params;
  const service = await findCleaningService(id);

  // Un identifiant inconnu, ou un service devenu inaccessible, donne un 404 :
  // la page ne doit pas laisser croire qu'un brouillon est ouvert.
  if (!service) notFound();

  return (
    <div>
      <AdminPageHeader
        titre="Modifier le service"
        sousTitre="Espace administrateur"
        chemin="/admin/cleaning"
        description={service.title}
      />

      <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <dl className="mb-8 grid gap-3 rounded-2xl border border-border bg-muted/50 p-5 text-sm sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Créé le</dt>
            <dd className="font-medium text-foreground">
              {new Date(service.created_at).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Photo</dt>
            <dd className="font-medium text-foreground">
              {service.image_url ? "1 photo" : "Aucune photo"}
            </dd>
          </div>
        </dl>

        <ServiceForm service={service} />
      </section>
    </div>
  );
}
