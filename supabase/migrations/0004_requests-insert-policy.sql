-- =============================================================================
-- KAS Immo — Migration 0004 : durcissement de la politique INSERT de `requests`
-- -----------------------------------------------------------------------------
-- À exécuter dans : Supabase Dashboard > SQL Editor > New query
--
-- L'audit RLS de `public.requests` a montré que la politique d'insertion
-- (`requests - creation ouverte`) ne contrôlait que l'identité (`user_id`).
-- Tout le reste était laissé au client : un appel direct à PostgREST pouvait
-- créer une demande dans n'importe quel statut, avec un type et des colonnes
-- incohérents, et un `created_at` arbitraire (antidaté ou futur).
--
-- Cette migration durcit cette UNIQUE politique. Elle ne touche ni à la table,
-- ni aux index, ni aux politiques SELECT / UPDATE / DELETE.
--
-- Ce qui change (WITH CHECK de « requests - creation ouverte »)
-- -------------------------------------------------------------
--   • `status` doit valoir 'nouveau' : une demande ne peut naître qu'« en
--     attente ». Les autres statuts ne s'obtiennent que par l'UPDATE admin.
--   • `type` est borné : 'visite_bien' ou 'devis_cleaning'.
--   • Pour une visite : `property_id` NOT NULL, `cleaning_service_id` NULL,
--     `cleaning_type` NULL.
--   • Pour un devis   : `property_id` NULL, `cleaning_service_id` NULL,
--     `cleaning_type` parmi ('bureau','appartement','immeuble','apres_demenagement').
--   • `created_at` doit valoir `now()` : toute date fournie par le client est
--     refusée, l'application ne fournissant jamais cette colonne (DEFAULT).
--   • La règle d'identité est conservée telle quelle : `user_id` NULL pour un
--     visiteur non connecté, ou égal à `auth.uid()` pour un utilisateur
--     connecté.
--
-- Ce qui n'est PAS touché
-- -----------------------
--   - Les politiques SELECT, UPDATE et DELETE de `requests`.
--   - Le cycle admin (lecture totale, changement de statut, suppression).
--   - Aucune ligne n'est réécrite : une politique RLS ne filtre que les
--     insertions de lignes NOUVELLES ; les demandes existantes sont intactes.
--
-- Pré-requis
-- ----------
--   La vérification effectuée dans l'éditeur Supabase a confirmé :
--     • une seule politique INSERT sur `requests` ;
--     • `relrowsecurity = true`, `relforcerowsecurity = false`.
--   Le garde-fou de la section 1 recalcule l'état réel avant d'agir.


-- =============================================================================
-- 1. GARDE-FOU : exactement une politique INSERT sur `requests`
-- =============================================================================
-- La sémantique RLS est OR-ée : toute politique INSERT supplémentaire, même
-- permissive, neutraliserait la correction ci-dessous. Ce bloc refuse donc de
-- poursuivre si l'état réel n'est pas « une seule politique INSERT ».
-- `raise exception` annule toute la transaction : soit le durcissement passe,
-- soit rien n'est appliqué.

do $$
declare
  nb_insert integer;
begin
  select count(*) into nb_insert
  from pg_policies
  where schemaname = 'public'
    and tablename = 'requests'
    and cmd = 'INSERT';

  if nb_insert <> 1 then
    raise exception
      'Migration 0004 interrompue : % politique(s) INSERT trouvée(s) sur public.requests (attendu : exactement 1). Inspectez pg_policies avant de poursuivre.',
      nb_insert;
  end if;
end
$$;


-- =============================================================================
-- 2. REMPLACEMENT DE LA POLITIQUE INSERT
-- =============================================================================
-- Même nom, mêmes rôles (`anon`, `authenticated`), même règle d'identité.
-- Le `with check` impose en plus la forme minimale d'une demande valide ainsi
-- que l'horodatage courant.

drop policy if exists "requests - creation ouverte" on public.requests;
create policy "requests - creation ouverte"
  on public.requests
  for insert
  to anon, authenticated
  with check (
    status = 'nouveau'
    and type in ('visite_bien', 'devis_cleaning')
    and (
      ( type = 'visite_bien'
        and property_id is not null
        and cleaning_service_id is null
        and cleaning_type is null )
      or
      ( type = 'devis_cleaning'
        and property_id is null
        and cleaning_service_id is null
        and cleaning_type in ('bureau', 'appartement', 'immeuble', 'apres_demenagement') )
    )
    and created_at = now()
    and (
      (auth.uid() is null and user_id is null)
      or (user_id = auth.uid())
    )
  );


-- =============================================================================
-- 3. POLITIQUES NON MODIFIÉES
-- =============================================================================
-- Rien n'est exécuté ici : rappel uniquement. Les politiques SELECT, UPDATE
-- et DELETE de `requests` restent celles définies par `supabase/schema.sql`
-- et ne sont pas recréées par ce fichier.


-- =============================================================================
-- ROLLBACK — restaure EXACTEMENT la politique INSERT d'origine
-- -----------------------------------------------------------------------------
-- À n'exécuter qu'en cas de besoin. Ce bloc remet l'état antérieur à la
-- migration 0004 :
--
--   drop policy if exists "requests - creation ouverte" on public.requests;
--   create policy "requests - creation ouverte"
--     on public.requests
--     for insert
--     to anon, authenticated
--     with check (
--       (auth.uid() is null and user_id is null)
--       or (user_id = auth.uid())
--     );
--
-- La politique d'origine restreignait uniquement l'identité ; les colonnes
-- `status`, `type`, `property_id`, `cleaning_service_id`, `cleaning_type` et
-- `created_at` redeviendraient libres pour tout insert via PostgREST public.
-- =============================================================================