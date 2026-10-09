import { ArrowLeft, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RequestVisitDialog } from "@/components/immobilier/request-visit-dialog";
import { PhotoGallery } from "@/components/immobilier/photo-gallery";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
  formatFcfa,
} from "@/lib/properties";
import { estUuid, trouverBienPublic } from "@/lib/properties-public";
import { immobilierContact } from "@/lib/site";
import { ContactActions } from "@/components/ContactActions";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";

/**
 * Fiche d'un bien.
 *
 * Mise en cache comme le catalogue, et invalidée explicitement par
 * `revalidatePath` lors des écritures admin : modifier le prix d'un bien se
 * voit immédiatement sur sa fiche, sans redéploiement.
 */
export const revalidate = 300;

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const bien = await trouverBienPublic(id);

  if (!bien) {
    return { title: "Bien introuvable — KAS Immobilier" };
  }

  return {
    title: `${bien.title} — KAS Immobilier`,
    description: `${PROPERTY_TYPE_LABELS[bien.type]} ${TRANSACTION_TYPE_LABELS[
      bien.transaction_type
    ].toLowerCase()} à ${bien.location} — ${formatFcfa(bien.price)}.`,
  };
}

export default async function FicheBienPage({ params }: PageProps) {
  const { id } = await params;

  // Un identifiant qui n'est pas un UUID ne peut pas exister : on évite un
  // aller-retour en base pour rien.
  if (!estUuid(id)) notFound();

  const bien = await trouverBienPublic(id);

  if (!bien) notFound();

  return (
    <article className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2">
        <Link href="/immobilier">
          <ArrowLeft aria-hidden="true" />
          Tous les biens
        </Link>
      </Button>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:gap-10">
        <div>
          <PhotoGallery photos={bien.photos} titre={bien.title} />

          <div className="mt-8">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Description
            </h2>
            {bien.description ? (
              <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-foreground sm:text-base">
                {bien.description}
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Aucune description n&apos;a encore été fournie pour ce bien.
                Contactez-nous au téléphone pour plus de détails.
              </p>
            )}
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <StatusBadge status={bien.status} />

            <h1 className="mt-4 text-xl leading-tight font-bold text-foreground sm:text-2xl">
              {bien.title}
            </h1>

            <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {bien.location}
            </p>

            <p className="mt-5 text-2xl font-bold text-foreground sm:text-3xl">
              {formatFcfa(bien.price)}
            </p>

            <dl className="mt-5 grid gap-2 border-t border-border pt-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Type de bien</dt>
                <dd className="font-medium text-foreground">
                  {PROPERTY_TYPE_LABELS[bien.type]}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Transaction</dt>
                <dd className="font-medium text-foreground">
                  {TRANSACTION_TYPE_LABELS[bien.transaction_type]}
                </dd>
              </div>
            </dl>

            {/* La demande de visite passe par une modale : le visiteur n'a pas
                à quitter la fiche, et il peut continuer à parcourir les photos
                pendant qu'il remplit le formulaire. */}
            <RequestVisitDialog
              propertyId={bien.id}
              propertyTitle={bien.title}
              propertyLocation={bien.location}
              className="mt-6 h-12 w-full gap-2"
            />

            {/* Les deux numéros de l'agence, chacun avec ses actions. La
                demande de visite ci-dessus reste une action distincte :
                passer par un formulaire n'est pas passer par un appel. */}
            <div className="mt-6 border-t border-border pt-5">
              <p className="eyebrow">Téléphone fixe</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {immobilierContact.fixedLine.display}
              </p>
              <ContactActions
                href={immobilierContact.fixedLine.href}
                className="mt-2"
              />

              <p className="eyebrow mt-5">Mobile</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {immobilierContact.mobile.display}
              </p>
              <ContactActions
                href={immobilierContact.mobile.href}
                className="mt-2"
              />

              {/* Seul WhatsApp de la page, et distinct du bouton flottant :
                  il emporte un message prérempli qui nomme le bien. Le
                  bouton flottant ouvre la conversation vide — utile à
                  l'échelle du site, mais ici KAS ne saurait pas de quel bien
                  le visiteur parle. C'est la seule différence fonctionnelle
                  qui justifie de garder un second accès.

                  Il est rendu en lien texte discret, jamais en gros logo :
                  deux marques concurrentes à l'écran feraient douter le
                  visiteur sur laquelle cliquer. */}
              <a
                href={immobilierContact.whatsappLink(
                  "Bonjour KAS Immo, je souhaite avoir des informations concernant ce bien immobilier.",
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-brand-text underline underline-offset-4 hover:text-brand-text/80"
              >
                <WhatsAppIcon className="size-3.5" />
                Écrire à KAS Immo au sujet de ce bien
              </a>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
