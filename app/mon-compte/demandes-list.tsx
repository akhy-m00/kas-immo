import Link from "next/link";
import {
  Building2,
  CalendarCheck,
  Clock,
  Inbox,
  MapPin,
  MessageSquare,
  Phone,
  Sparkles,
} from "lucide-react";

import { RequestStatusBadge } from "@/components/admin/request-status-badge";
import { Button } from "@/components/ui/button";
import {
  REQUEST_TYPE_LABELS,
  formatCreneau,
  formatDateTime,
  lienObjetDemande,
  objetDeLaDemande,
  type RequestWithProperty,
} from "@/lib/requests";

/**
 * Les demandes du demandeur, dans son espace client.
 *
 * Rendue côté serveur : `listerMesDemandes()` s'appuie sur la RLS de `requests`,
 * qui ne laisse un utilisateur lire que ses propres lignes. Aucun identifiant
 * n'est transmis au navigateur pour déroger à cette règle — c'est la base qui
 * filtre, pas la page.
 *
 * Le composant est donc un pur affichage, sans état ni bouton : le demandeur ne
 * fait rien de ses demandes ici, il les consulte et il appelle. C'est
 * l'administration qui traite la file, de l'autre côté.
 */
export function DemandesList({
  demandes,
}: {
  demandes: RequestWithProperty[];
}) {
  if (demandes.length === 0) {
    return <ListeVide />;
  }

  return (
    <ul className="grid gap-4">
      {demandes.map((demande) => (
        <CarteDemande key={demande.id} demande={demande} />
      ))}
    </ul>
  );
}

function CarteDemande({ demande }: { demande: RequestWithProperty }) {
  const lienObjet = lienObjetDemande(demande);
  const objet = objetDeLaDemande(demande);
  const creneau = formatCreneau(demande.desired_date, demande.desired_time);

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            {demande.type === "devis_cleaning" ? (
              <Sparkles aria-hidden="true" className="size-3" />
            ) : (
              <Building2 aria-hidden="true" className="size-3" />
            )}
            {REQUEST_TYPE_LABELS[demande.type]}
          </span>

          {lienObjet ? (
            <Link
              href={lienObjet}
              className="font-heading font-semibold text-foreground underline-offset-4 hover:underline"
            >
              {objet}
            </Link>
          ) : (
            <span className="font-heading font-semibold text-foreground">
              {objet}
            </span>
          )}

          {demande.property ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin aria-hidden="true" className="size-3" />
              {demande.property.location}
            </span>
          ) : null}
        </div>

        <RequestStatusBadge status={demande.status} />
      </div>

      {creneau ? (
        <p className="flex items-center gap-2 text-sm text-foreground">
          <CalendarCheck aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span>
            {/* Le libellé dépend du type : « Visite demandée » sur une demande
                Cleaning afficherait au client un mot qui ne parle pas de son
                demande. `objetDeLaDemande()` fournit déjà le sujet — le bien pour
                une visite, le type de nettoyage pour un rendez-vous. */}
            {objet} — {demande.type === "visite_bien" ? "visite demandée" : "rendez-vous demandé"}
            {" le "}
            <span className="font-medium">{creneau}</span>
          </span>
        </p>
      ) : null}

      {demande.message ? (
        <p className="flex gap-2 rounded-lg bg-muted px-3 py-2 text-sm leading-relaxed text-muted-foreground">
          <MessageSquare aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0 break-words">{demande.message}</span>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock aria-hidden="true" className="size-3" />
          Envoyée le {formatDateTime(demande.created_at)}
        </span>

        <a
          href={`tel:${demande.phone.replace(/\s+/g, "")}`}
          className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-foreground hover:underline"
        >
          <Phone aria-hidden="true" className="size-3" />
          {demande.phone}
        </a>
      </div>
    </li>
  );
}

function ListeVide() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      <Inbox aria-hidden="true" className="size-7 text-muted-foreground" />
      <p className="font-semibold text-foreground">Aucune demande envoyée</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Vos demandes de visite et vos demandes de rendez-vous Cleaning
        apparaîtront ici, avec le créneau demandé et le suivi de leur traitement.
      </p>

      <Button asChild size="sm" className="mt-2">
        <Link href="/immobilier">Parcourir les biens</Link>
      </Button>
    </div>
  );
}