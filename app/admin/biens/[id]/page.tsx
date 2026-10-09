import { notFound } from "next/navigation";

import { AdminPageHeader, adminMetadata } from "@/components/admin/admin-page";
import { PropertyForm } from "../property-form";
import { findProperty } from "@/lib/properties-admin";
import { formatFcfa } from "@/lib/properties";

export const metadata = adminMetadata(
  "Modifier un bien",
  "Modification d'une annonce immobilière et de ses photos.",
);

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminModifierBienPage({ params }: PageProps) {
  const { id } = await params;
  const bien = await findProperty(id);

  // Un identifiant inconnu, ou un bien devenu inaccessible, donne un 404 : la
  // page ne doit pas laisser croire qu'un brouillon est ouvert.
  if (!bien) notFound();

  return (
    <div>
      <AdminPageHeader
        titre="Modifier le bien"
        sousTitre="Espace administrateur"
        chemin="/admin/biens"
        description={bien.title}
      />

      <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <dl className="mb-8 grid gap-3 rounded-2xl border border-border bg-muted/50 p-5 text-sm sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Prix</dt>
            <dd className="font-heading text-lg font-bold text-foreground">
              {formatFcfa(bien.price)}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Créé le</dt>
            <dd className="font-medium text-foreground">
              {new Date(bien.created_at).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Photos</dt>
            <dd className="font-medium text-foreground">
              {bien.photos.length}
            </dd>
          </div>
        </dl>

        <PropertyForm bien={bien} />
      </section>
    </div>
  );
}
