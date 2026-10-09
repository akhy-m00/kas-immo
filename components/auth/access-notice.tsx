import { Info } from "lucide-react";

/**
 * Bandeau d'information affiché en haut d'une page après une redirection.
 *
 * Rendu par le serveur : aucun JavaScript supplémentaire, et le message est
 * présent dans le HTML dès la première réponse.
 */
export function AccessNotice({ message }: { message: string }) {
  return (
    <p
      role="status"
      className="mb-6 flex items-start gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-card-foreground"
    >
      <Info
        className="mt-0.5 size-4 shrink-0 text-brand-text"
        aria-hidden="true"
      />
      {message}
    </p>
  );
}
