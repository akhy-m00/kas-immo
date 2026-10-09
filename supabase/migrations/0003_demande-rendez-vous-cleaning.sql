-- =============================================================================
-- 0003 — KAS Cleaning : type de nettoyage d'une demande
-- =============================================================================
--
-- KAS Cleaning ne fonctionne plus comme un catalogue de prestations. Le
-- visiteur remplit un formulaire de DEMANDE DE RENDEZ-VOUS : il indique le type
-- de nettoyage, la date et l'heure souhaitees, son nom, son telephone et,
-- facultativement, un message. Aucune fiche ni prestation n'est choisie.
--
-- Cette migration ajoute donc une seule colonne a `public.requests`.
--
-- ---------------------------------------------------------------------------
-- Pourquoi une colonne et non le champ `message`
-- ---------------------------------------------------------------------------
-- Le type de nettoyage est une information structuree : l'administration doit
-- pouvoir le lire, l'afficher et le distinguer d'un coup. Ecrit dans `message`,
-- il ne serait plus qu'une chaine libre, ni filtrable, ni comparable, ni
-- recompteable : « Appartement » et « appartement » deviendraient deux valeurs
-- distinctes, et aucune requete ne pourrait les regrouper.
--
-- ---------------------------------------------------------------------------
-- Pourquoi `text` + CHECK plutot qu'une enum
-- ---------------------------------------------------------------------------
-- Une enum PostgreSQL fige ses valeurs dans le type : en ajouter une exige un
-- `ALTER TYPE`, qui se bloque si la colonne est utilisee dans une vue ou une
-- fonction. La liste des types de nettoyage est un choix commercial susceptible
-- d'evoluer ; un CHECK se fait evoluer en une ligne, sans blocage.
--
-- La contrainte apporte la meme integrite que l'enum pour l'ecriture : une
-- valeur hors liste est refusee par la base, pas seulement par l'application.
--
-- ---------------------------------------------------------------------------
-- Pourquoi nullable
-- ---------------------------------------------------------------------------
-- Les demandes immobilieres (`type = 'visite_bien'`) n'ont pas de type de
-- nettoyage. La colonne est donc NULLABLE, et le CHECK accepte explicitement
-- `cleaning_type is null`.
--
-- Consequence importante : cette migration ne réécrit AUCUNE ligne. Elle se
-- contente d'ajouter une colonne à NULL. Les demandes de visite existantes,
-- comme d'eventuelles demandes de devis deja enregistrees, restent
-- strictement inchangées.
--
-- L'obligation de renseigner `cleaning_type` pour `type = 'devis_cleaning'`
-- n'est donc PAS posee ici.
--
-- Une contrainte croise `type` <-> `cleaning_type` exigerait un CHECK avec une
-- sous-requete sur `auth.uid()`, ce que PostgreSQL n'exprime pas ; et elle
-- serait de toute façon fausse des la reception d'un brouillon. Cette regle
-- est appliquee cote serveur dans `creerDemandeDevisCleaning()`, comme c'est
-- deja le cas pour la coherence `visite_bien` <-> `property_id`.
--
-- ---------------------------------------------------------------------------
-- Perimetre volontairement exclu
-- ---------------------------------------------------------------------------
-- `cleaning_services` et `requests.cleaning_service_id` sont CONSERVES.
-- `/cleaning` ne les lit plus et le formulaire ne les renseigne plus, mais la
-- colonne reference encore la table : la supprimer ferait tomber la jointure
-- PostgREST `cleaning_services (...)` lue par `/admin/demandes` et
-- `/mon-compte`, et detruirait des donnees. Leur suppression est une decision
-- ulterieure, a prendre apres validation du nouveau parcours.
--
-- Aucune politique RLS n'est modifiee : les quatre policies existantes sur
-- `requests` sont independantes des colonnes et couvrent deja l'insertion
-- anonyme comme l'insertion par un utilisateur connecte.
-- -----------------------------------------------------------------------------

alter table public.requests
  add column if not exists cleaning_type text;

-- La contrainte est Named et crees separement : `ADD COLUMN IF NOT EXISTS`
-- n'accepte pas de contrainte, et la nommer evite de dependre du nom interne
-- que PostgreSQL genererait.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'requests_cleaning_type_check'
      and conrelid = 'public.requests'::regclass
  ) then
    alter table public.requests
      add constraint requests_cleaning_type_check check (
        cleaning_type is null
        or cleaning_type in ('bureau', 'appartement', 'immeuble', 'apres_demenagement')
      );
  end if;
end
$$;

comment on column public.requests.cleaning_type is
  'Type de nettoyage demande (bureau, appartement, immeuble, apres_demenagement). NULL pour une demande immobiliere. Valeur imposee cote serveur pour type = devis_cleaning.';

comment on column public.requests.cleaning_service_id is
  'Prestataire catalogue associee. Non renseigne depuis la refonte du formulaire Cleaning ; conservee pour la jointure et les demandes deja enregistrees.';