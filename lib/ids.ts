/**
 * Validation des identifiants.
 *
 * Un seul module pour une seule règle. Le motif du UUID était auparavant
 * recopié dans cinq fichiers : quatre copies correctes, une fausse — celle des
 * demandes — qui rejetait tous les identifiants et affichait « demande
 * introuvable » alors que la ligne existait et que l'UPDATE n'était jamais
 * parti. Aucun test ne l'avait vu, parce que rien ne relie les copies entre
 * elles. D'où ce module.
 *
 * Le format est la forme canonique 8-4-4-4-12. La version et la variante ne sont
 * pas contrôlées : PostgreSQL les génère, et une base peut contenir des
 * identifiants issus d'autres sources. Refuser un UUID valide serait bien plus
 * grave que d'en accepter un atypique — ce dernier se heurterait de toute façon
 * à la base, avec un message non ambigu.
 */

/** Motif d'un UUID canonique, en minuscules ou en majuscules. */
const MOTIF_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Vrai si `value` est un UUID canonique. */
export function estUuid(value: unknown): value is string {
  return typeof value === "string" && MOTIF_UUID.test(value);
}

/**
 * Message d'erreur d'un identifiant reçu mais invalide.
 *
 * Volontairement distinct de « objet introuvable » : l'un signifie « le lien
 * est cassé », l'autre « cet identifiant n'a pas été transmis ». Les confondre
 * avait produit un diagnostic faux sur les demandes de visite, où
 * l'administrateur était accusé d'avoir perdu une ligne qui existait toujours.
 */
export class ErreurIdentifiantInvalide extends Error {
  constructor(message = "Cet identifiant est invalide.") {
    super(message);
    this.name = "ErreurIdentifiantInvalide";
  }
}

/**
 * Renvoie l'identifiant s'il est un UUID, sinon lève.
 *
 * Utilisé par les Server Actions : une action reçoit ses arguments d'une
 * requête HTTP, donc un `id` peut être absent, du texte libre, ou tronqué.
 * Rejeter ici évite d'envoyer une requête invalide à PostgREST et d'en récupérer
 * un message technique illisible.
 */
export function exigerUuid(value: unknown): string {
  if (!estUuid(value)) {
    throw new ErreurIdentifiantInvalide();
  }

  return value;
}