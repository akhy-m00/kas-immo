import { Phone } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Bouton d'appel d'un numéro KAS Immo.
 *
 * Un seul composant, une seule action. Le WhatsApp n'a volontairement pas sa
 * place ici : le bouton flottant en est l'accès permanent sur tout le site.
 * Le réintroduire ici créerait un second accès à la même conversation, caché
 * dans la page, alors que le premier est déjà visible en permanence.
 *
 * Le rendu est un vrai lien `<a>` via `Button asChild` : `tel:` reste natif
 * et le clavier l'atteint.
 */
export function ContactActions({
  href,
  className,
}: {
  /** Lien `tel:` du numéro. */
  href: string;
  className?: string;
}) {
  return (
    <Button
      asChild
      variant="outline"
      size="lg"
      className={"h-11 " + (className ?? "")}
    >
      <a href={href}>
        <Phone aria-hidden="true" />
        Appeler
      </a>
    </Button>
  );
}