/**
 * Normalisation des numéros de téléphone sénégalais.
 *
 * Supabase Auth n'accepte un `phone` que s'il est au format E.164 : un
 * numéro local comme `77 123 45 67` est rejeté. Comme les clients sénégalais
 * tapent naturellement en format local, la conversion doit se faire avant
 * l'appel — sinon l'inscription échoue sur une saisie parfaitement normale.
 *
 * Formats acceptés en entrée :
 *
 *   77 123 45 67        → +221771234567
 *   771234567           → +221771234567
 *   (221) 77 123 45 67  → +221771234567
 *   +221 77 123 45 67   → +221771234567
 *   +221771234567       → +221771234567
 *   00221 77 123 45 67  → +221771234567
 *
 * Le format renvoyé est toujours `+221XXXXXXXXX`. Un numéro qui n'est pas
 * sénégalais, ou dont la longueur ne correspond pas, renvoie `null` : mieux
 * vaut refuser une saisie que d'envoyer à Supabase un identifiant douteux.
 *
 * Ce module contient aussi la conversion de ce numéro vers l'adresse
 * technique interne utilisée par Supabase Auth (`emailInterneDepuisTelephone`).
 * Elle est calculée à la volée à chaque appel et n'est stockée nulle part.
 */

/** Indicatif pays du Sénégal, sans le `+`. */
const INDICATIF_PAYS = "221";

/** Un numéro sénégalais fait 9 chiffres une fois l'indicatif retiré. */
const LONGUEUR_NATIONALE = 9;

/**
 * Premiers chiffres possibles d'un numéro sénégalais : `7` pour le mobile,
 * `3` pour le fixe. Le contrôle évite d'accepter une saisie qui a perdu un
 * chiffre en cours de route, et qui deviendrait sinon l'identifiant du compte.
 */
const PREFIXES_NATIONAUX_VALIDES = ["3", "7"];

/**
 * Convertit une saisie libre en numéro E.164, ou renvoie `null` si elle est
 * inexploitable.
 *
 * À appeler avant tout passage de `phone` à Supabase Auth, aussi bien à
 * l'inscription qu'à la connexion.
 */
export function normaliserTelephoneSenegalais(value: string): string | null {
  if (typeof value !== "string") return null;

  // Espaces, points, tirets, parenthèses et barres obliques sont purely
  // décoratifs : tous les numéros humains les contiennent.
  const compact = value.replace(/[\s.\-()/]/g, "");
  if (!compact) return null;

  // Le `+` de tête n'apporte rien : c'est l'indicatif pays qui compte, et il
  // est reconstruit plus bas. Les autres caractères sont rejetés, pas
  // silencieusement effacés.
  if (/[^0-9+]/.test(compact)) return null;
  let digits = compact.startsWith("+") ? compact.slice(1) : compact;
  if (!/^\d+$/.test(digits)) return null;

  // `00` est le préfixe international utilisé depuis l'étranger.
  if (digits.startsWith("00")) digits = digits.slice(2);

  // L'indicatif est facultatif à la saisie : `771234567` et `221771234567`
  // désignent le même abonné.
  const nationale = digits.startsWith(INDICATIF_PAYS)
    ? digits.slice(INDICATIF_PAYS.length)
    : digits;

  if (nationale.length !== LONGUEUR_NATIONALE) return null;
  if (!PREFIXES_NATIONAUX_VALIDES.includes(nationale[0])) return null;

  return `+${INDICATIF_PAYS}${nationale}`;
}

/**
 * Domaine réservé (RFC 6761) utilisé pour les adresses techniques internes.
 *
 * `.invalid` ne peut pas être enregistré dans le DNS : aucune adresse se
 * terminant par ce TLD ne peut donc appartenir à un vrai client. C'est ce qui
 * rend `estEmailTechniqueInterne()` fiable sans liste à maintenir — et ce qui
 * garantit qu'un e-mail de récupération ne peut jamais partir vers un domaine
 * réel.
 */
export const DOMAINE_EMAIL_INTERNE = "compte.invalid";

/**
 * Convertit un numéro sénégalais en adresse technique déterministe.
 *
 *   +221771234567 → 771234567@compte.invalid
 *
 * Le numéro est RENORMALISÉ ici, et non repris tel quel : une fonction qui
 * accepterait une chaîne libre finit toujours, un jour, par être appelée avec
 * autre chose qu'un numéro — et une adresse technique finissant par ne pas
 * venir du numéro de l'utilisateur serait un défaut d'authentification, pas un
 * détail de formatage. La normalisation étant idempotente, un numéro déjà en
 * E.164 ressort inchangé.
 *
 * ⚠️ Cette adresse n'est calculée que pour Supabase Auth. Elle ne doit jamais
 * être affichée, stockée dans `profiles`, ni envoyée dans un e-mail :
 * l'identifiant vu par l'utilisateur reste son numéro.
 *
 * Renvoie `null` si l'entrée n'est pas un numéro sénégalais, jamais une
 * adresse « devinée ».
 */
export function emailInterneDepuisTelephone(phone: string): string | null {
  const normalise = normaliserTelephoneSenegalais(phone);
  if (!normalise) return null;

  // `normalise` vaut `+221` suivi des 9 chiffres nationaux : on retire
  // l'indicatif, qui est déjà porté par le domaine de l'adresse.
  const nationale = normalise.slice(INDICATIF_PAYS.length + 1);
  return `${nationale}@${DOMAINE_EMAIL_INTERNE}`;
}

/**
 * Vrai si l'adresse est une adresse technique interne, donc ne doit jamais
 * être montrée à l'utilisateur.
 *
 * Le test porte sur le domaine seul, pas sur la forme complète : comme
 * `.invalid` est réservé, toute adresse qui s'y termine est nécessairement
 * technique. Les vrais clients ont des domaines ordinaires, qui ne peuvent pas
 * se terminer ainsi.
 *
 * Accepte `null` / `undefined` : la valeur vient d'une colonne nullable ou
 * d'un jeton, et l'appelant n'a pas à tester avant.
 */
export function estEmailTechniqueInterne(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(`@${DOMAINE_EMAIL_INTERNE}`);
}

/**
 * Met un numéro E.164 en forme lisible : `+221 77 123 45 67`.
 *
 * Destiné à l'affichage uniquement — `+221771234567` reste la valeur à
 * stocker et à envoyer à Supabase. Une valeur qui n'est pas un numéro
 * sénégalais est renvoyée telle quelle plutôt que mutilée.
 */
export function formaterTelephoneSenegalais(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (
    !digits.startsWith(INDICATIF_PAYS) ||
    digits.length !== INDICATIF_PAYS.length + LONGUEUR_NATIONALE
  ) {
    return e164;
  }

  const nationale = digits.slice(INDICATIF_PAYS.length);
  return `+${INDICATIF_PAYS} ${nationale.slice(0, 2)} ${nationale.slice(2, 5)} ${nationale.slice(5, 7)} ${nationale.slice(7)}`;
}

/** Message affiché sous le champ quand le numéro est refusé. */
export const MESSAGE_TELEPHONE_INVALIDE =
  "Saisissez un numéro sénégalais valide, par exemple 77 123 45 67.";

/** Aide courte affichée sous le champ : rassure sur l'indicatif automatique. */
export const INDICE_TELEPHONE =
  "L'indicatif +221 est ajouté automatiquement.";
