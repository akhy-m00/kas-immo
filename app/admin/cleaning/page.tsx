import Link from "next/link";
import { CheckCircle2, Sparkles } from "lucide-react";

import {
  AdminNotice,
  AdminPageHeader,
  adminMetadata,
} from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { listCleaningServices } from "@/lib/cleaning-admin";
import { ServicesList } from "./services-list";

export const metadata = adminMetadata(
  "Services cleaning",
  "Gestion des prestations de nettoyage proposées sur le site.",
);

/** Messages affichés après une redirection depuis le formulaire. */
const SUCCES = {
  "service-cree": "Le service a été créé.",
  "service-modifie": "Les modifications ont été enregistrées.",
} as const;

export default async function AdminCleaningPage({
  searchParams,
}: {
  searchParams: Promise<{ succes?: string }>;
}) {
  const { succes } = await searchParams;

  const services = await listCleaningServices();

  const message = succes ? SUCCES[succes as keyof typeof SUCCES] : undefined;

  return (
    <div>
      <AdminPageHeader
        titre="Services cleaning"
        sousTitre="Espace administrateur"
        chemin="/admin/cleaning"
        description={`${services.length} service${services.length > 1 ? "s" : ""} publié${services.length > 1 ? "s" : ""}.`}
        actions={
          <Button asChild size="lg">
            <Link href="/admin/cleaning/nouveau">
              <Sparkles aria-hidden="true" />
              Ajouter un service
            </Link>
          </Button>
        }
      />

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {message ? (
          <div className="mb-6">
            <AdminNotice ton="succes">
              <span className="flex items-center gap-2">
                <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
                {message}
              </span>
            </AdminNotice>
          </div>
        ) : null}

        <ServicesList services={services} />
      </section>
    </div>
  );
}
