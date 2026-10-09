import { REQUEST_STATUS_LABELS, REQUEST_STATUS_STYLES } from "@/lib/requests";
import type { RequestStatus } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

/**
 * Pastille de statut d'une demande.
 *
 * Sur le modèle de `status-badge.tsx` : chaque statut porte toujours son
 * libellé texte, la teinte ne fait qu'accélérer la lecture d'un tableau. Le
 * statut est aussi doublé par le `<select>` de la ligne, qui porte le nom
 * complet : la pastille ne doit jamais être le seul moyen de savoir où en est
 * une demande.
 */
type RequestStatusBadgeProps = {
  status: RequestStatus;
  className?: string;
};

export function RequestStatusBadge({
  status,
  className,
}: RequestStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        REQUEST_STATUS_STYLES[status],
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {REQUEST_STATUS_LABELS[status]}
    </span>
  );
}