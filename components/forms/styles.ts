/**
 * Styles communs à TOUS les champs de formulaire du site.
 *
 * Une seule règle, partout : libellé au-dessus, case pleine largeur de 48 px
 * de haut, aide ou erreur en dessous. Rien n'est dessiné à l'intérieur de la
 * bordure en dehors de la saisie.
 *
 * Pourquoi des chaînes partagées plutôt qu'une règle CSS globale : les
 * formulaires mélangent `<input>`, `<select>`, `<textarea>` et champs natifs
 * date/heure ; une classe explicite garde chaque champ lisible dans son
 * composant, et le CSS global (`app/globals.css`) ne sert que de filet de
 * sécurité contre les débordements.
 */

/** Libellé au-dessus du champ. */
export const CLASSE_LIBELLE = "mb-2 block text-sm font-medium text-foreground";

/**
 * Case de saisie (`input`, `select`).
 *
 * - `w-full max-w-full min-w-0 box-border` : la case ne dépasse jamais son
 *   conteneur, même quand le navigateur lui donne une largeur native (date et
 *   heure sur Safari iOS).
 * - `text-base` (16 px) : en dessous, Safari iOS zoome au focus.
 * - Focus aux couleurs de la marque ; teinte claire en mode sombre, où le
 *   bordeaux serait invisible sur le fond noir.
 */
export const CLASSE_CHAMP = [
  "box-border block h-12 w-full max-w-full min-w-0 rounded-xl border border-input bg-background px-3.5 text-left text-base text-foreground shadow-xs outline-none",
  "transition-[border-color,box-shadow] duration-200",
  "placeholder:text-muted-foreground/60",
  "focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20",
  "dark:bg-input/30 dark:focus:border-brand-400 dark:focus:ring-brand-400/25",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "aria-invalid:border-destructive aria-invalid:focus:border-destructive aria-invalid:focus:ring-destructive/20",
].join(" ");

/** Zone de texte multiligne : même style, hauteur libre. */
export const CLASSE_ZONE_TEXTE = CLASSE_CHAMP.replace(
  "h-12",
  "h-auto min-h-28 resize-y py-3",
);

/**
 * Champs natifs date et heure.
 *
 * `appearance-none` retire le gabarit natif de Safari iOS, qui impose sa
 * propre largeur minimale et faisait sortir la case du formulaire ; le
 * sélecteur natif s'ouvre toujours au toucher. `color-scheme` suit le thème
 * pour que le calendrier ne reste pas blanc en mode sombre.
 */
export const CLASSE_CHAMP_DATE_HEURE = `${CLASSE_CHAMP} appearance-none [-webkit-appearance:none] [color-scheme:light] dark:[color-scheme:dark]`;

/** Liste déroulante : flèche dessinée à part, donc place réservée à droite. */
export const CLASSE_LISTE = `${CLASSE_CHAMP} appearance-none pr-10`;

/** Aide sous le champ. */
export const CLASSE_AIDE = "mt-2 text-xs text-muted-foreground";

/** Erreur sous le champ. */
export const CLASSE_ERREUR = "mt-2 text-sm font-medium text-destructive";

/** Groupe libellé + case + aide : ne déborde jamais d'une grille. */
export const CLASSE_GROUPE = "flex min-w-0 flex-col";

/** Grille de deux champs côte à côte, une seule colonne sur mobile. */
export const CLASSE_GRILLE_2 = "grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2";
