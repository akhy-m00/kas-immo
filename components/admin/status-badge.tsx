import { PROPERTY_STATUS_LABELS } from "@/lib/properties";
import type { PropertyStatus } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

/**
 * Pastille de statut d'un bien.
 *
 * Les trois teintes sont choisies pour rester lisibles sur fond clair comme sur
 * fond sombre, et pour être distinguables sans dépendre de la seule couleur :
 * chacune est identifiable par son libellé texte, jamais par la teinte seule.
 */
const STYLES: Record<PropertyStatus, string> = {
  disponible:
    "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-300",
  loue: "border-amber-600/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:text-amber-300",
  vendu: "border-border bg-muted text-muted-foreground",
};

type StatusBadgeProps = {
  status: PropertyStatus;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        STYLES[status],
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {PROPERTY_STATUS_LABELS[status]}
    </span>
  );
}
