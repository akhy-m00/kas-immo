import type {
  CleaningService,
  CleaningType,
  Property,
  Request,
  RequestStatus,
  RequestType,
} from "@/lib/supabase/database.types";

/**
 * Domaine « demandes » : libellés, validation et formatage.
 *
 * Volontairement importable depuis un composant client, comme `lib/properties.ts`
 * : ce module ne dépend ni de `next/*`, ni d'un client Supabase. L'accès aux
 * données vit dans `lib/requests-public.ts` et `lib/requests-admin.ts`.
 *
 * Les valeurs de statut et de type reprennent celles de la table, sans accent
 * et sans espace : c'est la convention du schéma (`'loue'`, pas `'loué'`). Les
 * libellés affichés, eux, sont accentués.
 */

type Option<T extends string> = { value: T; label: string };

// =============================================================================
// Listes de valeurs
// =============================================================================

export const REQUEST_TYPES: Option<RequestType>[] = [
  { value: "visite_bien", label: "Visite de bien" },
  { value: "devis_cleaning", label: "Rendez-vous Cleaning" },
];

/**
 * Libellés d'affichage des types de demande.
 *
 * La valeur technique `devis_cleaning` reste inchangée : la renommer
 * obligerait à migrer l'enum `request_type`, ses policies et les types
 * générés, pour un gain purement éditorial. Seul le libellé a bougé, et il
 * décrit désormais ce que le visiteur fait réellement — il demande un
 * rendez-vous, dont la confirmation reste à donner par l'administration.
 */
export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  visite_bien: "Visite de bien",
  devis_cleaning: "Rendez-vous Cleaning",
};

export const TYPE_VALUES = REQUEST_TYPES.map((item) => item.value);

// =============================================================================
// Types de nettoyage
// =============================================================================

/**
 * Les quatre types de nettoyage proposés dans le formulaire.
 *
 * L'ordre est celui de l'affichage, du plus courant au plus spécifique. Les
 * valeurs sont celles de la contrainte CHECK `requests_cleaning_type_check` :
 * le premier niveau de défense reste la base, celle-ci n'étant qu'un confort.
 */
export const CLEANING_TYPES: Option<CleaningType>[] = [
  { value: "appartement", label: "Appartement" },
  { value: "immeuble", label: "Immeuble" },
  { value: "bureau", label: "Bureau" },
  { value: "apres_demenagement", label: "Après déménagement" },
];

export const CLEANING_TYPE_LABELS: Record<CleaningType, string> =
  CLEANING_TYPES.reduce(
    (accumulateur, { value, label }) => {
      accumulateur[value] = label;
      return accumulateur;
    },
    {} as Record<CleaningType, string>,
  );

export const CLEANING_TYPE_VALUES = CLEANING_TYPES.map((item) => item.value);

/** Description d'une option de nettoyage, pour les cartes radio du formulaire. */
export const CLEANING_TYPE_DESCRIPTIONS: Record<CleaningType, string> = {
  appartement: "Logement en appartement, avant ou après une location.",
  immeuble: "Parties communes et apartments d'un immeuble.",
  bureau: "Espaces de travail d'un local professionnel.",
  apres_demenagement: "Avant un état des lieux ou après un déménagement.",
};

/**
 * Libellé humain d'un type de nettoyage.
 *
 * Une valeur venue de la base mais hors liste — une ligne écrite avant la
 * contrainte, ou par un import — ne doit pas faire planter l'affichage de
 * l'administration. On affiche alors la valeur brute plutôt que `undefined`.
 */
export function cleaningTypeLabel(valeur: string | null | undefined): string {
  if (!valeur) return "";

  return CLEANING_TYPE_LABELS[valeur as CleaningType] ?? valeur;
}

/**
 * Les cinq statuts d'une demande, dans l'ordre de traitement.
 *
 * Cet ordre est aussi celui du tri par défaut dans l'administration : une
 * demande « En attente » remonte donc avant une demande « Terminée ».
 */
export const REQUEST_STATUSES: Option<RequestStatus>[] = [
  { value: "nouveau", label: "En attente" },
  { value: "en_cours", label: "En cours" },
  { value: "accepte", label: "Acceptée" },
  { value: "refuse", label: "Refusée" },
  { value: "termine", label: "Terminée" },
];

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> =
  REQUEST_STATUSES.reduce(
    (accumulateur, { value, label }) => {
      accumulateur[value] = label;
      return accumulateur;
    },
    {} as Record<RequestStatus, string>,
  );

export const STATUS_VALUES = REQUEST_STATUSES.map((item) => item.value);

/**
 * Teinte de chaque statut.
 *
 * Un statut n'est jamais signalé par la seule couleur : la pastille porte
 * toujours son libellé texte, lisible par un daltonien comme par un lecteur
 * d'écran. La teinte ne fait que recyclable la lecture d'un tableau.
 *
 * Les teintes sont choisies pour rester lisibles sur fond clair comme sur fond
 * sombre, sur le modèle de `components/admin/status-badge.tsx`.
 */
export const REQUEST_STATUS_STYLES: Record<RequestStatus, string> = {
  nouveau:
    "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300",
  en_cours:
    "border-sky-600/30 bg-sky-500/10 text-sky-700 dark:border-sky-400/30 dark:text-sky-300",
  accepte:
    "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-300",
  refuse:
    "border-destructive/30 bg-destructive/10 text-destructive",
  termine:
    "border-border bg-muted text-muted-foreground",
};

/** Un statut « à traiter » : la demande attend encore une action. */
export function estStatutEnAttente(status: RequestStatus): boolean {
  return status === "nouveau";
}

/** Un statut « clôturé » : la demande n'attend plus aucune action. */
export function estStatutCloture(status: RequestStatus): boolean {
  return status === "termine" || status === "refuse";
}

// =============================================================================
// Contraintes du formulaire
// =============================================================================

export const REQUEST_NAME_MIN = 3;
export const REQUEST_NAME_MAX = 120;
export const REQUEST_PHONE_MAX = 30;
export const REQUEST_MESSAGE_MAX = 1000;

/** Longueur minimale d'un téléphone, une fois les séparateurs retirés. */
export const REQUEST_PHONE_MIN_DIGITS = 6;

/** Longueur maximale d'un téléphone, une fois les séparateurs retirés. */
export const REQUEST_PHONE_MAX_DIGITS = 15;

/**
 * Fenêtre horaire proposée pour un rendez-vous.
 *
 * Elle encadre le contrôle, pas l'affichage : un créneau hors de cette plage
 * est refusé avec un message explicite plutôt que d'être envoyé à
 * l'administrateur, qui ne pourrait pas y répondre.
 *
 * ⚠️ Renommée depuis `VISITE_HEURE_*` : la borne est désormais partagée entre
 * une visite de bien et une demande de rendez-vous Cleaning. Le nom seul portait
 * encore « visite », et il aurait laissé croire que la Cleaning s'en servait
 * autrement. Les VALEURS sont inchangées, donc le comportement de la demande de
 * visite est rigoureusement identique.
 */
export const CRENEAU_HEURE_MIN = "07:00";
export const CRENEAU_HEURE_MAX = "21:00";

/** Fuseau de référence du site : Dakar n'observe ni heure d'été ni changement. */
export const FUSEAU_SITE = "Africa/Dakar";

/** Nombre de jours que le calendrier du formulaire laisse choisir. */
export const CRENEAU_JOURS_MAX = 90;

const MESSAGES = {
  nomVide: "Indiquez votre nom complet.",
  nomCourt: `Indiquez au moins ${REQUEST_NAME_MIN} caractères.`,
  nomLong: `Le nom ne doit pas dépasser ${REQUEST_NAME_MAX} caractères.`,
  telephoneVide: "Indiquez votre numéro de téléphone.",
  telephoneInvalide: "Indiquez un numéro de téléphone valide.",
  telephoneLong: `Le numéro ne doit pas dépasser ${REQUEST_PHONE_MAX} caractères.`,
  dateVide: "Choisissez la date souhaitée.",
  dateInvalide: "Saisissez une date valide.",
  datePassee: "Choisissez une date à partir d'aujourd'hui.",
  dateTropLoin: `Choisissez une date dans les ${CRENEAU_JOURS_MAX} prochains jours.`,
  heureVide: "Choisissez l'heure souhaitée.",
  heureInvalide: "Saisissez une heure valide.",
  heureHorsPlage: `Choisissez un créneau entre ${CRENEAU_HEURE_MIN} et ${CRENEAU_HEURE_MAX}.`,
  messageLong: `Le message ne doit pas dépasser ${REQUEST_MESSAGE_MAX} caractères.`,
  cleaningTypeVide: "Choisissez le type de nettoyage.",
  cleaningTypeInconnu: "Choisissez un type de nettoyage proposé.",
} as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HEURE_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

// =============================================================================
// Validation
// =============================================================================

/** Erreurs de validation par nom de champ, pour le formulaire. */
export type VisitRequestFieldErrors = Partial<
  Record<
    "fullName" | "phone" | "desiredDate" | "desiredTime" | "message",
    string
  >
>;

/**
 * Champs communs à toutes les demandes, une fois le formulaire validé.
 *
 * Nom, téléphone et message sont identiques pour une visite de bien et un devis
 * de prestation : mêmes contraintes, mêmes messages, même normalisation. Ils
 * sont donc validés une seule fois, par `validerIdentiteDemandeur()`.
 */
export type DemandeIdentite = {
  fullName: string;
  phone: string;
  /** `null` si le demandeur n'a rien écrit. */
  message: string | null;
};

/** Erreurs des seuls champs communs, réutilisées par les deux formulaires. */
export type IdentiteFieldErrors = Partial<
  Record<"fullName" | "phone" | "message", string>
>;

/**
 * Valide le nom, le téléphone et le message d'une demande.
 *
 * Factorisée hors de `parseVisitRequestForm` parce que la demande de devis
 * Cleaning demande exactement les mêmes trois champs. La dupliquer aurait
 * produit deux jeux de règles divergents : il suffisait qu'un seuil change d'un
 * côté pour qu'un devis accepte un nom que la visite refuse, sans qu'aucune
 * vérification ne s'en aperçoive.
 *
 * Les règles restent celles du projet — `estTelephoneValide()`, bornée par
 * `REQUEST_PHONE_*` — et n'ont pas été réécrites pour l'occasion.
 */
function validerIdentiteDemandeur(formData: FormData): {
  valeur: DemandeIdentite;
  fieldErrors: IdentiteFieldErrors;
} {
  const fieldErrors: IdentiteFieldErrors = {};

  // ---------------------------------------------------------------- nom
  const fullName = text(formData, "fullName").replace(/\s+/g, " ");

  if (!fullName) {
    fieldErrors.fullName = MESSAGES.nomVide;
  } else if (fullName.length < REQUEST_NAME_MIN) {
    fieldErrors.fullName = MESSAGES.nomCourt;
  } else if (fullName.length > REQUEST_NAME_MAX) {
    fieldErrors.fullName = MESSAGES.nomLong;
  }

  // ------------------------------------------------------------ téléphone
  const phone = text(formData, "phone");

  if (!phone) {
    fieldErrors.phone = MESSAGES.telephoneVide;
  } else if (phone.length > REQUEST_PHONE_MAX) {
    fieldErrors.phone = MESSAGES.telephoneLong;
  } else if (!estTelephoneValide(phone)) {
    fieldErrors.phone = MESSAGES.telephoneInvalide;
  }

  // --------------------------------------------------------------- message
  const message = text(formData, "message").trim();
  let messageNormalise: string | null = null;

  if (message) {
    if (message.length > REQUEST_MESSAGE_MAX) {
      fieldErrors.message = MESSAGES.messageLong;
    } else {
      messageNormalise = message;
    }
  }

  return {
    valeur: { fullName, phone, message: messageNormalise },
    fieldErrors,
  };
}

/**
 * Valide le créneau demandé : la date et l'heure.
 *
 * Factorisée pour la même raison que `validerIdentiteDemandeur()` : une visite
 * de bien et un rendez-vous Cleaning demandent le même créneau, avec les mêmes
 * bornes. Les règles vivent donc à un seul endroit.
 *
 * Les deux valeurs reviennent à `null` en cas d'erreur ET en cas d'absence —
 * l'appelant décide si le créneau est obligatoire. `parseVisitRequestForm()` le
 * rend obligatoire, `parseCleaningQuoteForm()` aussi, mais la distinction reste
 * explicite chez l'appelant plutôt que masquée ici.
 */
function validerCreneau(formData: FormData): {
  valeur: { date: string | null; heure: string | null };
  fieldErrors: Partial<Record<"desiredDate" | "desiredTime", string>>;
} {
  const fieldErrors: Partial<Record<"desiredDate" | "desiredTime", string>> =
    {};

  // ----------------------------------------------------------------- date
  const desiredDate = text(formData, "desiredDate");
  let dateNormalisee: string | null = null;

  if (!desiredDate) {
    fieldErrors.desiredDate = MESSAGES.dateVide;
  } else if (!DATE_RE.test(desiredDate) || !estDateReelle(desiredDate)) {
    fieldErrors.desiredDate = MESSAGES.dateInvalide;
  } else {
    // Comparaison lexicographique : sur `AAAA-MM-JJ`, l'ordre alphabétique EST
    // l'ordre chronologique, donc aucune conversion en `Date` n'est nécessaire
    // et aucun fuseau n'intervient.
    const aujourdhui = aujourdhuiAuSite();

    if (desiredDate < aujourdhui) {
      fieldErrors.desiredDate = MESSAGES.datePassee;
    } else {
      // Plafond : un rendez-vous se prépare, il ne se réserve pas six mois à
      // l'avance, et la borne borne la taille du calendrier affiché.
      const limite = new Date(`${aujourdhui}T00:00:00Z`);
      limite.setUTCDate(limite.getUTCDate() + CRENEAU_JOURS_MAX);
      const limiteIso = aujourdhuiAuSite(limite);

      if (desiredDate > limiteIso) {
        fieldErrors.desiredDate = MESSAGES.dateTropLoin;
      } else {
        dateNormalisee = desiredDate;
      }
    }
  }

  // ----------------------------------------------------------------- heure
  const desiredTime = text(formData, "desiredTime");
  let heureNormalisee: string | null = null;

  if (!desiredTime) {
    fieldErrors.desiredTime = MESSAGES.heureVide;
  } else if (!HEURE_RE.test(desiredTime)) {
    fieldErrors.desiredTime = MESSAGES.heureInvalide;
  } else if (
    desiredTime < CRENEAU_HEURE_MIN ||
    desiredTime > CRENEAU_HEURE_MAX
  ) {
    fieldErrors.desiredTime = MESSAGES.heureHorsPlage;
  } else {
    heureNormalisee = desiredTime;
  }

  return {
    valeur: { date: dateNormalisee, heure: heureNormalisee },
    fieldErrors,
  };
}

/**
 * Champs d'une demande de visite, une fois le formulaire validé.
 *
 * Aucun e-mail ici, et c'est délibéré : l'adresse du demandeur est celle de son
 * compte quand il est connecté, et une demande de visite se traite au
 * téléphone. Stocker une copie dans `requests` créerait une seconde source
 * capable de diverger de `auth.users` sans que rien ne le signale.
 */
export type VisitRequestInput = {
  fullName: string;
  phone: string;
  /** `AAAA-MM-JJ`, ou `null` si le demandeur n'en a pas indiqué. */
  desiredDate: string | null;
  /** `HH:MM`, ou `null`. */
  desiredTime: string | null;
  message: string | null;
};

export type VisitRequestParseResult =
  | { ok: true; value: VisitRequestInput }
  | { ok: false; fieldErrors: VisitRequestFieldErrors };

/** Le `FormData` est une requête HTTP : rien de ce qu'il contient n'est fiable. */
function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Réduit un téléphone à ses seuls chiffres.
 *
 * Les numéros ouest-africains s'écrivent localement (77 123 45 67, avec ou sans
 * indicatif +221) : accepter les séparateurs est nécessaire, refuser un
 * numéro pour son format décourageerait une part des clients.
 */
export function chiffresTelephone(value: string): string {
  return value.replace(/\D/g, "");
}

/** Vrai si un téléphone contient assez de chiffres pour être joignable. */
export function estTelephoneValide(value: string): boolean {
  const chiffres = chiffresTelephone(value);

  return (
    chiffres.length >= REQUEST_PHONE_MIN_DIGITS &&
    chiffres.length <= REQUEST_PHONE_MAX_DIGITS
  );
}

/** Vrai si une date existe réellement, et pas seulement si elle est « bien formée ». */
function estDateReelle(iso: string): boolean {
  const [annee, mois, jour] = iso.split("-").map(Number);

  const date = new Date(Date.UTC(annee, mois - 1, jour));

  return (
    date.getUTCFullYear() === annee &&
    date.getUTCMonth() === mois - 1 &&
    date.getUTCDate() === jour
  );
}

/**
 * Le jour du mois au format `AAAA-MM-JJ`, à Dakar.
 *
 * Utilisé comme borne basse du champ `<input type="date">` et pour refuser une
 * date déjà passée. La date est calculée à Dakar et non sur l'heure du serveur :
 * un déploiement hébergé à l'UTC refuserait jusqu'à huit heures de la journée
 * aux visiteurs qui rédigent leur demande le matin.
 */
export function aujourdhuiAuSite(reference: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSEAU_SITE,
  }).format(reference);
}

/**
 * Valide et normalise le formulaire de demande de visite.
 *
 * Appelée côté serveur uniquement, depuis une Server Action : c'est la seule
 * validation qui fait autorité, celle du navigateur n'étant qu'un confort.
 */
export function parseVisitRequestForm(
  formData: FormData,
): VisitRequestParseResult {
  const fieldErrors: VisitRequestFieldErrors = {};

  // Nom, téléphone et message : mêmes règles pour tous les types de demande,
  // validées une seule fois.
  const identite = validerIdentiteDemandeur(formData);

  Object.assign(fieldErrors, identite.fieldErrors);

  // Créneau demandé : mêmes bornes pour une visite de bien et un rendez-vous
  // Cleaning. Validé une seule fois, par `validerCreneau()`.
  const creneau = validerCreneau(formData);

  Object.assign(fieldErrors, creneau.fieldErrors);

  // Le message a été validé et normalisé avec le nom et le téléphone.

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      fullName: identite.valeur.fullName,
      phone: identite.valeur.phone,
      desiredDate: creneau.valeur.date,
      desiredTime: creneau.valeur.heure,
      message: identite.valeur.message,
    },
  };
}

// =============================================================================
// Demande de rendez-vous Cleaning
// =============================================================================

/**
 * Champs d'une demande de rendez-vous Cleaning, une fois le formulaire validé.
 *
 * `cleaningType` remplace l'ancien choix d'une prestation : le visiteur indique
 * ce qu'il faut nettoyer, et la prestation est déduite de ce choix par
 * l'administration. Aucune surface, adresse ni fréquence n'est demandée — un
 * devis se qualifie par l'échange commercial, pas par un formulaire long.
 */
export type CleaningQuoteInput = DemandeIdentite & {
  cleaningType: CleaningType;
  desiredDate: string;
  desiredTime: string;
};

/** Erreurs de validation du formulaire de rendez-vous Cleaning. */
export type CleaningQuoteFieldErrors = IdentiteFieldErrors &
  Partial<Record<"desiredDate" | "desiredTime" | "cleaningType", string>>;

export type CleaningQuoteParseResult =
  | { ok: true; value: CleaningQuoteInput }
  | { ok: false; fieldErrors: CleaningQuoteFieldErrors };

/**
 * Valide et normalise le formulaire de demande de rendez-vous Cleaning.
 *
 * Les trois blocs de règles sont ceux déjà en place, réutilisés tels quels :
 * `validerIdentiteDemandeur()` pour le nom, le téléphone et le message,
 * `validerCreneau()` pour la date et l'heure.
 *
 * Seul le type de nettoyage est propre à ce formulaire. Il est validé contre
 * `CLEANING_TYPE_VALUES` — la meme liste que les cartes radio — et non contre
 * une regexp : le navigateur ne propose que ces quatre valeurs, mais le
 * `FormData` est une requête HTTP et rien de ce qu'il contient n'est fiable.
 * La contrainte CHECK de la base reste le dernier rempart.
 */
export function parseCleaningQuoteForm(
  formData: FormData,
): CleaningQuoteParseResult {
  const identite = validerIdentiteDemandeur(formData);
  const creneau = validerCreneau(formData);

  // -------------------------------------------------------- type de nettoyage
  const cleaningType = text(formData, "cleaningType");
  const fieldErrors: CleaningQuoteFieldErrors = {
    ...identite.fieldErrors,
    ...creneau.fieldErrors,
  };

  if (!cleaningType) {
    fieldErrors.cleaningType = MESSAGES.cleaningTypeVide;
  } else if (!CLEANING_TYPE_VALUES.includes(cleaningType as CleaningType)) {
    fieldErrors.cleaningType = MESSAGES.cleaningTypeInconnu;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  // `validerCreneau()` renvoie `null` quand le champ est absent, mais ici la
  // date et l'heure sont OBLIGATOIRES : le champErrors correspondant a donc
  // toujours ete pose, et l'absence de valeur ici serait un defaut de logique,
  // pas une saisie. Le controle non-null documente cette garantie au
  // compilateur plutot que de laisser un `null` fuir vers l'insertion.
  return {
    ok: true,
    value: {
      fullName: identite.valeur.fullName,
      phone: identite.valeur.phone,
      message: identite.valeur.message,
      cleaningType: cleaningType as CleaningType,
      desiredDate: creneau.valeur.date as string,
      desiredTime: creneau.valeur.heure as string,
    },
  };
}

// =============================================================================
// Formatage
// =============================================================================

/**
 * Une date `AAAA-MM-JJ` en toutes lettres, ex. « 5 octobre 2026 ».
 *
 * La date est reconstruite en UTC puis formatée en UTC : aucune heure locale
 * n'intervient, donc un serveur déployé à l'autre bout du monde rend le même
 * texte que le navigateur du visiteur. Sans cela, `new Date("2026-10-05")`,
 * interprété en UTC puis affiché en heure locale, pouvait afficher le 4 octobre.
 */
export function formatDateSouhaitee(iso: string | null): string {
  if (!iso) return "";

  const [annee, mois, jour] = iso.split("-").map(Number);
  if (!annee || !mois || !jour) return iso;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(annee, mois - 1, jour)));
}

/**
 * Une heure renvoyée par PostgreSQL, ramenée à `HH:MM`.
 *
 * La colonne est un `time` : PostgREST renvoie `14:30:00`. Les secondes sont
 * toujours nulles sur une saisie d'`input type="time"`, mais elles sont
 * retirées pour que l'affichage ne dépende pas du format de la base.
 */
export function formatHeureSouhaitee(heure: string | null): string {
  if (!heure) return "";

  return heure.slice(0, 5);
}

/** Date et heure d'un créneau souhaité, sur une ligne, ex. « lundi 5 octobre 2026 à 14:30 ». */
export function formatCreneau(iso: string | null, heure: string | null): string {
  const date = formatDateSouhaitee(iso);
  const heureCourte = formatHeureSouhaitee(heure);

  if (date && heureCourte) return `${date} à ${heureCourte}`;
  if (date) return date;

  return heureCourte;
}

/**
 * Un horodatage `timestamptz` en date et heure lisibles, à Dakar.
 *
 * Le fuseau est explicite des deux côtés : le serveur et le navigateur rendent
 * donc la même chaîne, ce qui évite un écart d'hydratation sur une page
 * dynamique comme `/admin/demandes` ou `/mon-compte`.
 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return iso;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: FUSEAU_SITE,
  }).format(date);
}

// =============================================================================
// Demande et objet demandé
// =============================================================================

/** Le bien concerné par une demande, tel que renvoyé par la jointure. */
export type RequestWithProperty = Request & {
  property: Pick<Property, "id" | "title" | "location" | "status"> | null;
  /** Conservée : le catalogue n'est plus utilisé par le formulaire. */
  cleaningService: Pick<
    CleaningService,
    "id" | "title" | "image_url"
  > | null;
};

/**
 * Ce qu'une demande affiche de l'objet qu'elle concerne.
 *
 * Le libellé est résolu une seule fois, car il est utilisé à trois endroits —
 * titre de la demande, ligne de la liste admin, liste « Mes demandes » — et la
 * logique ne doit pas être réécrite à chaque appel.
 *
 * L'ordre des branches n'est pas indifférent. Pour une demande Cleaning moderne,
 * ni `property` ni `cleaningService` ne sont renseignés : c'est le type de
 * nettoyage qui qualifie la demande. Sans cette branche, `objetDeLaDemande()`
 * tomberait sur son fallback « Prestation cleaning supprimée » et
 * l'administration afficherait, pour chaque rendez-vous, un objet supprimé qui
 * n'a jamais existé.
 */
export function objetDeLaDemande(demande: RequestWithProperty): string {
  if (demande.property) return demande.property.title;
  if (demande.cleaningService) return demande.cleaningService.title;

  // Rendez-vous Cleaning : la demande porte son type de nettoyage, qui est
  // aussi son objet. Une valeur absente malgré tout (ligne importée, contrainte
  // posée après coup) retombe sur un libellé neutre plutôt que sur un texte
  // mentant sur une suppression.
  if (demande.type === "devis_cleaning") {
    return (
      cleaningTypeLabel(demande.cleaning_type) || "Demande de nettoyage"
    );
  }

  return "Bien supprimé du catalogue";
}

/** Un lien vers la fiche du bien, ou `null` si le bien n'existe plus. */
export function lienObjetDemande(
  demande: RequestWithProperty,
): string | null {
  return demande.property ? `/immobilier/${demande.property.id}` : null;
}
