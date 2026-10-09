import { ContactActions } from "@/components/ContactActions";

import { immobilierContact } from "@/lib/site";

/**
 * Les deux lignes de contact de KAS Immo, sur la page Contact.
 *
 * Une seule action par ligne — Appeler. Le WhatsApp est accessible en
 * permanence via le bouton flottant : lui en ajouter un ici créerait deux
 * accès à la même conversation, dont un noyé dans la page. Le libellé
 * « Mobile / WhatsApp » indique que ce numéro est joignable par WhatsApp
 * sans dupliquer le bouton.
 *
 * La page Contact est la seule zone du site à afficher les deux lignes : le
 * pied de page, présent sur toutes les pages, ne les répète pas.
 */
export function ImmoContactLines({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p className="eyebrow">Téléphone fixe</p>
      <p className="mt-2 text-lg font-semibold text-foreground">
        {immobilierContact.fixedLine.display}
      </p>
      <ContactActions href={immobilierContact.fixedLine.href} className="mt-3" />

      <p className="eyebrow mt-6">Mobile / WhatsApp</p>
      <p className="mt-2 text-lg font-semibold text-foreground">
        {immobilierContact.mobile.display}
      </p>
      <ContactActions href={immobilierContact.mobile.href} className="mt-3" />
    </div>
  );
}