-- =============================================================================
-- KAS Immo — Migration 0002 : demandes de visite
-- -----------------------------------------------------------------------------
-- À exécuter dans : Supabase Dashboard > SQL Editor > New query
--
-- Pourquoi cette migration
-- ------------------------
-- La table `requests` existe déjà (créée par `supabase/schema.sql`) et ses
-- politiques RLS sont complètes et correctes : cette migration n'y touche pas.
-- Elle ne fait qu'ADAPTER la table au formulaire de demande de visite, qui
-- demande deux informations de plus — la date et l'heure souhaitées — et
-- étendre la liste des statuts.
--
-- Ce qui est ajouté / modifié
-- ---------------------------
--   + requests.desired_date   — date de visite souhaitée (nouvelle colonne)
--   + requests.desired_time   — heure de visite souhaitée (nouvelle colonne)
--   ~ request_status          — 3 valeurs remplacées par 5 :
--                                'nouveau'  'en_cours'  'accepte'
--                                'refuse'   'termine'
--   ~ requests.status         — colonne recréée pour porter le nouvel enum
--   ~ requests.full_name      — passe de NULL-able à NOT NULL
--   ~ requests.phone          — passe de NULL-able à NOT NULL
--
-- Ce qui n'est PAS touché
-- -----------------------
--   - AUCUNE colonne `email` n'est créée. L'adresse e-mail d'un demandeur
--     connecté est celle de son compte, gérée par Supabase Auth ; demander un
--     e-mail dans le formulaire de visite et le recopier ici créerait une
--     seconde source de vérité, capable de diverger de `auth.users` sans que
--     rien ne le signale. La demande se traite au téléphone, et c'est le seul
--     canal de rappel dont elle dispose.
--   - Aucune politique RLS n'est modifiée, aucune n'est ajoutée.
--   - `requests_user_id_idx` et `requests_created_at_idx` sont conservés.
--   - `user_id` reste déterminé par la session, jamais par le formulaire.
--
-- ⚠️ Perte de donnée possible
-- ---------------------------
-- L'enum `request_status` ne peut pas être modifié valeur par valeur : il faut
-- recréer le type, donc recréer la colonne `status`. La colonne **et ses lignes**
-- sont supprimées.
--
-- Le script refuse donc de s'exécuter si la table contient déjà des demandes.
-- Le garde-fou est en section 1 : il lève une exception, ce qui annule toute la
-- transaction. Dans ce cas, il faut d'abord convertir les lignes existantes —
-- par exemple `update requests set status = 'nouveau' where status = 'traite'`
-- — puis relancer ce fichier tel quel.
--
-- La table `requests` est vide sur ce projet : le garde-fou laisse la migration
-- s'exécuter sans intervention.


-- =============================================================================
-- 1. GARDE-FOU : la table doit être vide
-- =============================================================================
-- `raise exception` annule toute la transaction : soit les 5 étapes suivantes
-- passent, soit aucune n'est appliquée. On ne peut donc pas se retrouver avec
-- un enum à 5 valeurs et une colonne `status` pleine de valeurs invalides.

do $$
begin
  if exists (select 1 from public.requests) then
    raise exception
      'La table public.requests contient des lignes : la migration 0002 supprimerait la colonne status. Videz la table ou adaptez la migration avant de l''exécuter.';
  end if;
end
$$;


-- =============================================================================
-- 2. RECRÉATION DE L'ENUM request_status
-- -----------------------------------------------------------------------------
-- `alter type ... add value` ne s'applique qu'aux enums dont on veut AJOUTER
-- des valeurs, jamais pour retirer 'traite'. Retirer une valeur d'un enum
-- PostgreSQL impose de recréer le type.
--
-- On supprime d'abord la colonne qui l'utilise, sinon `drop type` échoue sur
-- une dépendance. La suppression de la colonne supprime aussi l'index
-- `requests_status_idx`, qui est reconstruit en section 4.
-- =============================================================================

alter table public.requests alter column status drop default;
alter table public.requests drop column status;

drop type if exists public.request_status;

-- Les valeurs sont en ASCII, sans accent ni espace : c'est la convention déjà
-- suivie par `property_status` ('loue', pas 'loué') et par les autres listes
-- de contrôle du schéma.
create type public.request_status as enum (
  'nouveau',   -- En attente : reçue, pas encore traitée
  'en_cours',  -- En cours  : l'administrateur s'en occupe
  'accepte',   -- Acceptée  : la visite est confirmée
  'refuse',    -- Refusée   : la demande ne sera pas satisfaite
  'termine'    -- Terminée  : la visite a eu lieu
);

alter table public.requests add column status public.request_status not null default 'nouveau';

comment on type public.request_status is
  'Avancement d''une demande : nouveau (en attente), en_cours, accepte, refuse, termine.';


-- =============================================================================
-- 3. COLONNES DU FORMULAIRE DE VISITE
-- -----------------------------------------------------------------------------
-- DEUX colonnes seulement : la date et l'heure souhaitées.
--
-- `desired_date` est un `date` (jour, sans heure) et `desired_time` un `time`
-- (heure, sans fuseau) : c'est exactement ce que renvoie un `<input
-- type="date">` et un `<input type="time">`, sans conversion ni fuseau à
-- calculer. Le créneau est donné par le demandeur, ce n'est pas un rendez-vous
-- confirmé : il n'est donc pas daté en `timestamptz`, qui aurait figé un fuseau
-- arbitraire sur une heure locale.
--
-- Elles restent NULLABLES, et c'est volontaire : une demande sans rendez-vous
-- n'a pas de créneau. Les rendre NOT NULL les rendrait impossibles à écrire, et
-- la validation de leur présence appartient au formulaire, qui sait s'il est
-- en train de demander une visite ou autre chose.
--
-- Il n'y a PAS de colonne `email` : voir l'en-tête de ce fichier.
-- =============================================================================

alter table public.requests add column if not exists desired_date date;
alter table public.requests add column if not exists desired_time time;

comment on column public.requests.desired_date  is 'Jour de visite souhaité par le demandeur. NULL pour une demande sans rendez-vous.';
comment on column public.requests.desired_time  is 'Heure de visite souhaitée par le demandeur. NULL pour une demande sans rendez-vous.';
comment on column public.requests.message       is 'Message libre du demandeur.';

-- Nom et téléphone deviennent obligatoires.
--
-- Le formulaire de demande de visite les demande systématiquement, et ce sont
-- les SEULES coordonnées portées par la demande : sans elles, l'administration
-- n'a aucun moyen de rappeler le demandeur et la ligne ne lui sert à rien.
--
-- Un visiteur non connecté les saisit lui-même — c'est `user_id`, et lui seul,
-- qui reste nullable, puisqu'une visite peut être demandée sans compte.
--
-- La contrainte est posée ici, en base, et pas seulement dans le formulaire : un
-- formulaire se contourne, une contrainte `NOT NULL` non.
--
-- Sûr : la garde de la section 1 a déjà vérifié que la table est vide.
alter table public.requests alter column full_name set not null;
alter table public.requests alter column phone     set not null;


-- =============================================================================
-- 4. INDEX
-- -----------------------------------------------------------------------------
-- `requests_status_idx` a été supprimé avec la colonne `status` : il est
-- reconstruit à l'identique. Les deux autres index sont intacts.
-- =============================================================================

create index if not exists requests_status_idx on public.requests (status);


-- =============================================================================
-- 5. RAPPEL DES POLITIQUES APPLIQUABLES À `requests`
-- -----------------------------------------------------------------------------
-- Aucune n'est modifiée ici. Elles sont recopiées pour que ce fichier se lise
-- seul, et parce que ce sont elles qui garantissent les règles du système de
-- demandes. Si l'une d'elles disparaît, la fonctionnalité est cassée.
--
--   • INSERT  (anon, authenticated)
--       (auth.uid() is null and user_id is null) or (user_id = auth.uid())
--     → un visiteur non connecté peut déposer une demande, sans compte.
--     → un client connecté ne peut déposer QUE sous son propre identifiant :
--       `user_id` est imposé par la session, il ne peut pas être choisi dans
--       le formulaire.
--
--   • SELECT  (authenticated)
--       user_id = auth.uid() or public.is_admin(auth.uid())
--     → un client ne voit que ses demandes, un administrateur les voit toutes.
--     → un visiteur non connecté n'a AUCUNE politique de lecture : il ne peut
--       pas relire la demande qu'il vient de déposer.
--
--   • UPDATE / DELETE (authenticated)
--       public.is_admin(auth.uid())
--     → seul un administrateur change un statut ou supprime une demande.
--     → aucun utilisateur ne peut modifier ou supprimer la demande d'un autre.
--
-- Rappel de conception : `user_id` est en ON DELETE SET NULL. Supprimer un
-- compte laisse la demande en place, détachée de son auteur — c'est un contact
-- commercial, il ne doit pas disparaître avec le compte.
--
-- Les contraintes `NOT NULL` posées en section 3 ne changent rien à ces
-- politiques : elles portent sur la présence des valeurs, pas sur qui peut les
-- écrire. Un visiteur non connecté écrit toujours son nom et son téléphone
-- lui-même, et l'administration rappelle cette personne.
--
-- L'absence de colonne `email` n'affaiblit pas non plus ces politiques : la RLS
-- porte sur les LIGNES, pas sur les colonnes, et elle s'applique à `requests`
-- quelle que soit sa forme. L'e-mail du demandeur reste hors de la table, dans
-- `auth.users`, où il est déjà protégé.
-- =============================================================================
