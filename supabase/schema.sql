-- =============================================================================
-- KAS Immo — Structure de la base de donnees
-- Projet Supabase : kas-immo
--
-- A executer dans : Supabase Dashboard > Table Editor > SQL Editor > New query
--
-- Ce script est concu pour etre relance : les types, la fonction et les
-- politiques sont recrees a chaque execution. Les tables sont creees avec
-- "if not exists" : les donnees deja presentes ne sont jamais supprimees.
--
-- Sommaire :
--   1. Types de controle (listes de valeurs autorisees)
--   2. Fonction utilitaire is_admin()
--   3. Tables : profiles, properties, property_photos, cleaning_services,
--               favorites, requests
--   4. Index
--   5. Row Level Security : activation + politiques
--   6. Declencheur : creation automatique du profil a l inscription
-- =============================================================================


-- =============================================================================
-- 1. TYPES DE CONTROLE
-- -----------------------------------------------------------------------------
-- Plutot qu un texte libre, on impose une liste de valeurs autorisees. Le
-- type `enum` est plus strict qu une contrainte CHECK : PostgreSQL refuse
-- la valeur et signale le probleme tot, et l autocompletion fonctionne dans
-- l editeur SQL.
--
-- Chaque type est encapsule dans un bloc "do" avec un test d existence, ce
-- qui rend le script relançable : une deuxieme execution ne leve pas
-- l erreur "type already exists".
-- =============================================================================

-- Role d un utilisateur : client (par defaut) ou admin.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('client', 'admin');
  end if;
end
$$;

-- Type de bien immobilier.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'property_type') then
    create type public.property_type as enum ('appartement', 'maison', 'terrain', 'bureau');
  end if;
end
$$;

-- Nature de la transaction.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'transaction_type') then
    create type public.transaction_type as enum ('location', 'vente');
  end if;
end
$$;

-- Disponibilite d un bien.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'property_status') then
    create type public.property_status as enum ('disponible', 'loue', 'vendu');
  end if;
end
$$;

-- Nature d une demande.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'request_type') then
    create type public.request_type as enum ('visite_bien', 'devis_cleaning');
  end if;
end
$$;

-- Avancement d une demande.
--
-- Les cinq valeurs decrivent le cycle complet d une demande de visite : elle
-- arrive (`nouveau`), quelqu un la prend en charge (`en_cours`), puis elle est
-- acceptee, refusee, ou acceptee ET aboutie (`termine`).
--
-- `accepte` et `termine` sont distincts : une visite acceptee a une date, elle
-- n a pas encore eu lieu. Sans cette separation, l administration ne pourrait
-- pas distinguer une visite a venir d une visite faite, alors que c est
-- exactement ce qui l interesse dans une liste.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'request_status') then
    create type public.request_status as enum (
      'nouveau', 'en_cours', 'accepte', 'refuse', 'termine'
    );
  end if;
end
$$;


-- =============================================================================
-- 2. FONCTION UTILITAIRE : verifier le role admin
-- -----------------------------------------------------------------------------
-- ⚠️ Cette fonction est definie ICI, apres les tables de la section 3, et
-- non avant : PostgreSQL verifie le corps d une fonction `language sql` a la
-- creation. Definie plus tot, elle echouerait avec
-- "relation public.profiles does not exist".
--
-- C est la brique reutilisee par toutes les politiques declarees plus bas.
-- On lui passe un user_id, et l appelant lui transmet `auth.uid()`.
--
-- SECURITY DEFINER : la fonction s execute avec les droits de son
-- proprietaire (postgres) au lieu de ceux de l appelant. C est indispensable
-- ici, sinon la politique sur `profiles`, qui interroge `profiles`, se
-- rejouerait indefiniment (recursion infinie).
--
-- STABLE : la fonction est calee dans une transaction, le plan peut etre
-- reutilise.
--
-- `set search_path = public` : verrouille la resolution de noms sur le
-- schema public, ce qui empeche un objet malveillant cree dans un autre
-- schema de detourner la fonction.
--
-- La fonction est definie en `security definer` : elle contourne donc la RLS
-- de `profiles`, ce qui est exactement le but recherche ici.
-- =============================================================================


-- =============================================================================
-- 3. TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles — un profil par compte authentifie
-- -----------------------------------------------------------------------------
-- La colonne `id` est a la fois cle primaire ET reference vers auth.users.
-- Les deux tables partagent le meme identifiant : pas de colonne de liaison
-- separee, et donc pas de desynchronisation possible.
--
-- ON DELETE CASCADE : supprimer le compte dans Supabase Auth supprime aussi
-- son profil, et en cascade ses favoris.
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  role        public.user_role    not null default 'client',
  created_at  timestamptz         not null default now()
);

comment on table  public.profiles is 'Un profil par compte authentifie, lie 1:1 a auth.users.';
comment on column public.profiles.id    is 'Identifiant du compte, identique a auth.users.id.';
comment on column public.profiles.role  is 'client = utilisateur normal, admin = gerant du site.';

-- -----------------------------------------------------------------------------
-- properties — les biens immobiliers
-- -----------------------------------------------------------------------------
-- `price` est un bigint (entier 64 bits) car le FCFA n a pas de centimes.
-- Un entier evite les approximations des flottants et les arrondis.
--
-- `created_by` est ON DELETE SET NULL : si le compte de l admin auteur est
-- supprime, l annonce reste en ligne mais devient orpheline plutot que
-- disparaitre.
-- -----------------------------------------------------------------------------

create table if not exists public.properties (
  id                uuid primary key default gen_random_uuid(),
  title             text                      not null,
  description       text,
  type              public.property_type      not null,
  transaction_type  public.transaction_type   not null,
  price             bigint                    not null check (price >= 0),
  location          text                      not null,
  status            public.property_status    not null default 'disponible',
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz               not null default now()
);

comment on table  public.properties is 'Biens immobiliers annonces sur le site, en location ou a la vente.';
comment on column public.properties.price      is 'Prix en FCFA, entier : le FCFA n a pas de centimes.';
comment on column public.properties.created_by is 'Profil de l admin auteur. NULL si ce compte a ete supprime.';

-- -----------------------------------------------------------------------------
-- property_photos — les photos d un bien
-- -----------------------------------------------------------------------------
-- `position` ordonne l affichage : la valeur la plus proche de 0 passe en
-- premier.
--
-- ON DELETE CASCADE : supprimer un bien supprime ses photos, il n y a pas
-- d interet a garder des photos orphelines.
-- -----------------------------------------------------------------------------

create table if not exists public.property_photos (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid        not null references public.properties (id) on delete cascade,
  url          text        not null,
  position     integer     not null default 0,
  created_at   timestamptz not null default now()
);

comment on table public.property_photos is 'Photos d un bien, affichees dans l ordre croissant de position.';

-- -----------------------------------------------------------------------------
-- cleaning_services — les prestations de nettoyage
-- -----------------------------------------------------------------------------
-- Cette table n est volontairement pas rattachee a auth.users : une prestation
-- est un contenu editorial, elle n appartient pas a un compte.
-- -----------------------------------------------------------------------------

create table if not exists public.cleaning_services (
  id          uuid primary key default gen_random_uuid(),
  title       text        not null,
  description text,
  image_url   text,
  created_at  timestamptz not null default now()
);

comment on table public.cleaning_services is 'Prestations de nettoyage proposees, par exemple Nettoyage appartement.';

-- -----------------------------------------------------------------------------
-- favorites — les biens mis en favori
-- -----------------------------------------------------------------------------
-- La contrainte UNIQUE (user_id, property_id) est ce qui empeche
-- d enregistrer deux fois le meme bien. Elle cree implicitement un index
-- unique, il n en faut pas d autre pour cette table.
--
-- Les deux ON DELETE CASCADE signifient qu un bien supprime disparait aussi
-- des favoris de tout le monde.
-- -----------------------------------------------------------------------------

create table if not exists public.favorites (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles (id)  on delete cascade,
  property_id  uuid        not null references public.properties (id) on delete cascade,
  created_at   timestamptz not null default now(),
  constraint favorites_user_property_unique unique (user_id, property_id)
);

comment on table public.favorites is 'Biens sauvegardes par un client. Un meme bien ne peut etre enregistre qu une seule fois par utilisateur.';

-- -----------------------------------------------------------------------------
-- requests — les demandes des visiteurs et des clients
-- -----------------------------------------------------------------------------
-- Les deux references sont facultatives : une demande de visite pointe vers
-- un bien, une demande de devis vers un service de nettoyage, jamais les
-- deux. Elles restent NULL lorsqu un visiteur non connecte ecrit.
--
-- `user_id` est ON DELETE SET NULL : la demande est un contact commercial,
-- elle doit survivre a la suppression du compte qui l a emise.
--
-- Nom et telephone sont `NOT NULL` : ce sont les seules informations portees
-- par la demande par lesquelles joindre le demandeur, et l administration ne
-- peut rien faire d une demande sans elles. C est `user_id`, et lui seul, qui
-- reste nullable, puisque la visite est possible sans etre connecte.
--
-- Il n y a volontairement AUCUNE colonne `email` : l adresse du demandeur est
-- celle de son compte, dans `auth.users`. La recopier ici creerait une seconde
-- source de verite capable de diverger sans que rien ne le signale.
--
-- `desired_date` et `desired_time` portent le creneau DEMANDE, pas un
-- rendez-vous confirme : un `date` et un `time` sans fuseau evitent de figer une
-- heure locale arbitraire, l administration reconvenant le demandeur pour
-- confirmer. Ils sont NULL tant que la demande n en porte pas.
--
-- `cleaning_type` est le type de nettoyage demande, pour `type =
-- 'devis_cleaning'`. C est une colonne TEXT et non une enum : quatre valeurs
-- ne suffisent pas a figer un modele commercial, et ajouter une valeur a une
-- enum PostgreSQL est plus penible qu ajouter une valeur a un CHECK.
--
-- Elle est NULLABLE, et c est indispensable : les demandes immobilieres
-- n ont pas de type de nettoyage, et la contrainte `CHECK` doit donc
-- l accepter explicitement (`cleaning_type is null or ...`). Aucune ligne
-- existante n est reecrite.
--
-- `cleaning_service_id` est conservee telle quelle, ainsi que la table
-- `cleaning_services` : la colonne n est plus utilisee par le formulaire de
-- Cleaning, mais la retirer ferait tomber la jointure PostgREST lue par les
-- listes de demandes, et la suppression d une table referencee est une
-- decision qui se prend apres validation du nouveau parcours, pas pendant.
-- -----------------------------------------------------------------------------

create table if not exists public.requests (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references public.profiles (id) on delete set null,
  type                public.request_type   not null,
  property_id         uuid references public.properties (id) on delete set null,
  cleaning_service_id uuid references public.cleaning_services (id) on delete set null,
  cleaning_type       text,
  full_name           text not null,
  phone               text not null,
  message             text,
  desired_date        date,
  desired_time        time,
  status              public.request_status not null default 'nouveau',
  created_at          timestamptz           not null default now(),
  constraint requests_cleaning_type_check check (
    cleaning_type is null
    or cleaning_type in ('bureau', 'appartement', 'immeuble', 'apres_demenagement')
  )
);

comment on table  public.requests is 'Demandes de visite ou de devis, emises par un client connecte ou un visiteur.';
comment on column public.requests.user_id is 'NULL lorsque la demande provient d un visiteur non connecte.';
comment on column public.requests.desired_date is 'Jour de visite souhaite par le demandeur. NULL pour une demande sans rendez-vous.';
comment on column public.requests.desired_time is 'Heure de visite souhaite par le demandeur. NULL pour une demande sans rendez-vous.';


-- =============================================================================
-- 3 bis. FONCTION is_admin() — definie apres les tables, voir section 2
-- =============================================================================

create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and role = 'admin'
  );
$$;

comment on function public.is_admin(uuid) is
  'Renvoie vrai si le profil du user_id fourni a le role admin. SECURITY DEFINER evite la recursion des politiques RLS.';


-- =============================================================================
-- 4. INDEX
-- -----------------------------------------------------------------------------
-- On indexe les colonnes filtrees par le site (recherche par type, par
-- transaction_type, par status) et les colonnes de jointure, pour eviter un
-- scan sequentiel de la table.
--
-- Le tri par date decroissante sert a afficher les annonces et demandes les
-- plus recentes en premier.
--
-- Sur `favorites`, pas d index supplementaire : la contrainte UNIQUE
-- (user_id, property_id) en fournit deja un.
-- =============================================================================

create index if not exists properties_type_idx             on public.properties (type);
create index if not exists properties_transaction_type_idx on public.properties (transaction_type);
create index if not exists properties_status_idx           on public.properties (status);
create index if not exists properties_created_at_idx       on public.properties (created_at desc);

create index if not exists property_photos_property_id_idx on public.property_photos (property_id, position);

create index if not exists requests_status_idx    on public.requests (status);
create index if not exists requests_user_id_idx   on public.requests (user_id);
create index if not exists requests_created_at_idx on public.requests (created_at desc);


-- =============================================================================
-- 5. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
-- RLS est active sur les 6 tables, sans exception. Une fois activee, le role
-- anon (celui du navigateur) n acccede a une table que par les politiques
-- declarees ci-dessous : tout le reste est refuse.
--
-- L ordre de cette section suit celui de la section 3.
-- =============================================================================

alter table public.profiles         enable row level security;
alter table public.properties        enable row level security;
alter table public.property_photos   enable row level security;
alter table public.cleaning_services enable row level security;
alter table public.favorites         enable row level security;
alter table public.requests          enable row level security;


-- -----------------------------------------------------------------------------
-- 5.1 properties — lecture publique, ecriture reservee aux admins
-- -----------------------------------------------------------------------------
-- Lecture : `using (true)` autorise tout le monde, visiteurs inclus, car une
-- annonce est une page publique. Sans cette politique, la table serait
-- illisible et le site n afficherait aucun bien.
--
-- Ecriture : `with check` verifie la ligne qui va etre ecrite, `using` verifie
-- la ligne qui existe deja. Les deux sont necessaires sur un UPDATE, sinon un
-- admin pourrait modifier un bien puis en changer le proprietaire.
-- -----------------------------------------------------------------------------

drop policy if exists "properties - lecture publique" on public.properties;
create policy "properties - lecture publique"
  on public.properties
  for select
  to anon, authenticated
  using (true);

drop policy if exists "properties - creation admin" on public.properties;
create policy "properties - creation admin"
  on public.properties
  for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

drop policy if exists "properties - modification admin" on public.properties;
create policy "properties - modification admin"
  on public.properties
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "properties - suppression admin" on public.properties;
create policy "properties - suppression admin"
  on public.properties
  for delete
  to authenticated
  using (public.is_admin(auth.uid()));


-- -----------------------------------------------------------------------------
-- 5.2 property_photos — lecture publique, ecriture reservee aux admins
-- -----------------------------------------------------------------------------
-- Meme principe que properties, avec une difference : le role admin est
-- verifie via le bien parent. On s assure ainsi que l auteur de la photo
-- dispose reellement des droits d administration, sans dupliquer la regle
-- "est admin" dans chaque politique.
-- -----------------------------------------------------------------------------

drop policy if exists "property_photos - lecture publique" on public.property_photos;
create policy "property_photos - lecture publique"
  on public.property_photos
  for select
  to anon, authenticated
  using (true);

drop policy if exists "property_photos - creation admin" on public.property_photos;
create policy "property_photos - creation admin"
  on public.property_photos
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_id
        and public.is_admin(auth.uid())
    )
  );

drop policy if exists "property_photos - modification admin" on public.property_photos;
create policy "property_photos - modification admin"
  on public.property_photos
  for update
  to authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id
        and public.is_admin(auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_id
        and public.is_admin(auth.uid())
    )
  );

drop policy if exists "property_photos - suppression admin" on public.property_photos;
create policy "property_photos - suppression admin"
  on public.property_photos
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id
        and public.is_admin(auth.uid())
    )
  );


-- -----------------------------------------------------------------------------
-- 5.3 cleaning_services — lecture publique, ecriture reservee aux admins
-- -----------------------------------------------------------------------------

drop policy if exists "cleaning_services - lecture publique" on public.cleaning_services;
create policy "cleaning_services - lecture publique"
  on public.cleaning_services
  for select
  to anon, authenticated
  using (true);

drop policy if exists "cleaning_services - creation admin" on public.cleaning_services;
create policy "cleaning_services - creation admin"
  on public.cleaning_services
  for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

drop policy if exists "cleaning_services - modification admin" on public.cleaning_services;
create policy "cleaning_services - modification admin"
  on public.cleaning_services
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "cleaning_services - suppression admin" on public.cleaning_services;
create policy "cleaning_services - suppression admin"
  on public.cleaning_services
  for delete
  to authenticated
  using (public.is_admin(auth.uid()));


-- -----------------------------------------------------------------------------
-- 5.4 profiles — chacun son profil, les admins voient tout
-- -----------------------------------------------------------------------------
-- 1. Lecture : sa propre ligne, ou toutes si l on est admin.
--
-- 2. Modification : deux garde-fous.
--    a) Un client ne peut pas toucher son role. Le `with check` impose
--       `role = client` sur sa propre ligne, donc un
--       "update profiles set role = admin" echoue. Sans ce `with check`, un
--       client pourrait s auto-attribuer le role admin : c est la faille la
--       plus grave possible sur cette table, elle est donc traitee
--       explicitement.
--    b) Seul un admin peut modifier la ligne de quelqu un d autre, et donc
--       promouvoir un collegue. Comme la condition porte sur
--       `id <> auth.uid()`, un admin ne peut pas retirer son propre role et
--       se verrouiller dehors par erreur.
--
-- 3. Aucune politique INSERT : un profil est uniquement cree par le
--    declencheur de la section 6. Un visiteur ne peut donc pas fabriquer un
--    profil avec le role admin.
--
-- 4. Aucune politique DELETE : la suppression passe par Supabase Auth, qui
--    declenche le ON DELETE CASCADE.
-- -----------------------------------------------------------------------------

drop policy if exists "profiles - lecture de son profil ou admin" on public.profiles;
create policy "profiles - lecture de son profil ou admin"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "profiles - modification de son profil ou admin" on public.profiles;
create policy "profiles - modification de son profil ou admin"
  on public.profiles
  for update
  to authenticated
  using (
    (id = auth.uid()      and role = 'client')
    or (id <> auth.uid() and public.is_admin(auth.uid()))
  )
  with check (
    (id = auth.uid()      and role = 'client')
    or (id <> auth.uid() and public.is_admin(auth.uid()))
  );


-- -----------------------------------------------------------------------------
-- 5.5 favorites — chaque client gere uniquement ses propres favoris
-- -----------------------------------------------------------------------------
-- `user_id = auth.uid()` sur l INSERT est indispensable : sans cette
-- condition, un client authentifie pourrait ajouter un favori au nom d un
-- autre utilisateur.
--
-- Pas de politique UPDATE : un favori ne se modifie pas. Le client le
-- supprime puis l ajoute a nouveau s il change d avis, ce qui evite une
-- surface d ecriture inutile.
-- -----------------------------------------------------------------------------

drop policy if exists "favorites - lecture de ses favoris" on public.favorites;
create policy "favorites - lecture de ses favoris"
  on public.favorites
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "favorites - creation" on public.favorites;
create policy "favorites - creation"
  on public.favorites
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "favorites - suppression" on public.favorites;
create policy "favorites - suppression"
  on public.favorites
  for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));


-- -----------------------------------------------------------------------------
-- 5.6 requests — creation ouverte, lecture et suivi reserves
-- -----------------------------------------------------------------------------
-- Les trois cas demandes :
--   • visiteur non connecte : peut creer, ne peut pas relire
--   • client connecte       : peut creer, relire ses propres demandes
--   • admin                 : lit tout, met a jour le statut
--
-- Point cle sur l INSERT : `user_id` est determine par la session, jamais
-- par le client. Si une session existe, `user_id = auth.uid()` oblige la
-- demande a appartenir a celui qui l emet ; sinon la seule possibilite est
-- `user_id is null`. Personne ne peut donc deposer une demande sous
-- l identite de quelqu un d autre, ni faire relire au client une demande
-- qu un visiteur a injectee.
--
-- Depuis la migration 0004, le `with check` impose en plus la FORME d une
-- demande neuve, afin de fermer tout insert forge via PostgREST :
--   • `status` vaut 'nouveau' : la demande ne change d etat que par l UPDATE
--     admin, seule porte d acces aux autres statuts ;
--   • `type` est borne aux deux valeurs metier ;
--   • les colonnes liees sont coherentes : `visite_bien` exige `property_id`
--     et exclut le nettoyage ; `devis_cleaning` exige `cleaning_type` (parmi
--     les quatre valeurs du CHECK) et exclut le bien ;
--   • `created_at` doit valoir le `now()` de la transaction : une date choisie
--     par le client est rejetee.
--
-- Ces regles portent sur la forme de la demande, pas sur le contenu des
-- colonnes de contact : un visiteur peut se declarer sous un nom et un numero
-- qui ne sont pas les siens. C est volontaire — c est un contact commercial,
-- et l administration rappelle la personne qui a rempli le formulaire.
-- La coherence du couple demande/bien (le bien doit exister et rester
-- disponible) est verifiee dans `lib/requests-public.ts` avant l INSERT, ce
-- qu une simple politique RLS ne peut pas porter seule.
--
-- Aucune colonne `email` : l adresse du demandeur connecte appartient a son
-- compte. Ce n est donc pas une donnee de la demande, et elle ne peut pas y
-- etre injectee par un visiteur.
--
-- Le `select` ne porte que sur `authenticated` : un visiteur non connecte
-- n a aucune politique de lecture et ne peut donc pas relire sa demande,
-- conformement a la demande initiale.
-- -----------------------------------------------------------------------------

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

drop policy if exists "requests - lecture de ses demandes ou admin" on public.requests;
create policy "requests - lecture de ses demandes ou admin"
  on public.requests
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "requests - modification par admin" on public.requests;
create policy "requests - modification par admin"
  on public.requests
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "requests - suppression par admin" on public.requests;
create policy "requests - suppression par admin"
  on public.requests
  for delete
  to authenticated
  using (public.is_admin(auth.uid()));


-- =============================================================================
-- 6. DECLENCHEUR : creer un profil automatiquement a l inscription
-- -----------------------------------------------------------------------------
-- `after insert on auth.users` : des qu un compte est cree (formulaire,
-- Google, magic link...), une ligne profiles est creee avec le role client.
-- Sans cela, un inscrit arrive sans profil et ne peut donc ni ajouter de
-- favori ni etre associe a une demande.
--
-- SECURITY DEFINER : le declencheur s execute avec les droits de postgres,
-- ce qui lui permet d ecrire dans profiles malgre RLS.
--
-- `on conflict (id) do nothing` : rend le declencheur sur dans le cas ou le
-- profil existe deja (rejeu, import de donnees).
--
-- `drop trigger if exists` rend le script relançable.
--
-- full_name et phone sont repris des metadonnees d inscription si le
-- formulaire les a fournies, sinon la colonne reste NULL.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    'client'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Declencheur : cree automatiquement une ligne profiles de role client a chaque inscription dans auth.users.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- =============================================================================
-- 7. ETAPES SUIVANTES, DANS L ORDRE
-- -----------------------------------------------------------------------------
-- 1. Verifier que RLS est bien actif sur les 6 tables :
--      Table Editor > chaque table > Active Row Level Security doit etre coche.
--
-- 2. Verifier que vous pouvez toujours selectionner et editer les lignes :
--    le role postgres est proprietaire des tables, donc la RLS ne
--    s applique pas a lui. Si une ligne semble manquante dans l editeur,
--    le probleme vient d ailleurs.
--
-- 3. Creer le premier administrateur. La RLS interdit a un client de
--    s auto-attribuer le role admin : il faut le passer en SQL une seule
--    fois, sur un projet vide :
--
--      update public.profiles
--      set role = 'admin'
--      where id = 'COLLEZ-ICI-LE-UUID-DU-COMPT';
--
--      L UUID se trouve dans Authentication > Users.
--
-- 4. Ne pas oublier : le front Next.js a besoin d un `proxy.ts` pour
--    rafraichir la session (voir lib/supabase/). Tant que la page
--    /connexion n est pas cablee, ce fichier n est pas necessaire.
-- =============================================================================


-- =============================================================================
-- 8. STOCKAGE : LE BUCKET "properties"
-- -----------------------------------------------------------------------------
-- Le bucket "properties" existe deja et est marque "public". Cette section ne
-- fait QUE declarer les politiques d acces aux objets qu il contient : elle ne
-- cree pas le bucket et ne modifie pas les autres buckets du projet.
--
-- Ou sont stockees les photos :
--   properties/{id-du-bien}/{nom-du-fichier}
--
-- Pourquoi la RLS s applique aussi au Storage :
-- "public" ne veut pas dire "ouvert en ecriture". Le bucket est public en
-- LECTURE, ce qui suffit a afficher une annonce a un visiteur non connecte.
-- Toutes les politiques d ecriture ci-dessous exigent le role admin, donc une
-- personne ne peut pas deposer, remplacer ni supprimer un fichier sur le site,
-- meme en devinant une URL.
--
-- ⚠️ Ces politiques ne s appliquent qu au role SQL `authenticated`, celui d un
-- utilisateur connecte. Le role `anon` (visiteur) n a QUE la politique de
-- lecture : sans elle, aucune photo ne s afficherait.
-- =============================================================================

-- ATTENTION : aucune instruction `alter table storage.objects ...` ici.
-- La table `storage.objects` appartient a `supabase_storage_admin`, pas au role
-- du SQL Editor : toute commande ALTER echoue avec
--   ERROR: must be owner of table objects
-- et fait echouer tout le script. La RLS sur cette table est DEJA activee par
-- defaut sur les projets Supabase, il n y a donc rien a activer.
-- Les seules operations autorisees ici sont les `create policy` ci-dessous.

-- -----------------------------------------------------------------------------
-- 8.1 Lecture publique des photos
-- -----------------------------------------------------------------------------
-- `using (true)` : tout le monde lit, visiteur non connecte compris. C est le
-- comportement attendu d une photo d annonce.
--
-- La restriction `bucket_id = 'properties'` est indispensable : sans elle, la
-- politique ouvrirait la lecture de TOUS les fichiers prives du projet
-- (pieces jointes, documents, etc.).
-- -----------------------------------------------------------------------------

drop policy if exists "properties - lecture publique des photos" on storage.objects;
create policy "properties - lecture publique des photos"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'properties');

-- -----------------------------------------------------------------------------
-- 8.2 Ecriture reservee aux admins
-- -----------------------------------------------------------------------------
-- Les trois operations d ecriture partagent la meme condition :
-- `public.is_admin(auth.uid())`, la fonction definie en section 3 bis, qui
-- verifie le role en base plutot que de faire confiance a une valeur envoyee
-- par le client.
--
-- `with check` est indispensable sur INSERT et UPDATE : il verifie la ligne
-- qui va etre ecrite. Sans lui, un admin pourrait deposer un fichier dans un
-- bucket prive en positionnant `bucket_id` sur un autre nom.
-- -----------------------------------------------------------------------------

drop policy if exists "properties - envoi de photos par un admin" on storage.objects;
create policy "properties - envoi de photos par un admin"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'properties' and public.is_admin(auth.uid()));

drop policy if exists "properties - modification de photos par un admin" on storage.objects;
create policy "properties - modification de photos par un admin"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'properties' and public.is_admin(auth.uid()))
  with check (bucket_id = 'properties' and public.is_admin(auth.uid()));

drop policy if exists "properties - suppression de photos par un admin" on storage.objects;
create policy "properties - suppression de photos par un admin"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'properties' and public.is_admin(auth.uid()));

-- =============================================================================
-- 9. Photos des prestations de cleaning (bucket `cleaning`)
-- =============================================================================
-- Meme modele que la section 8, applique au bucket `cleaning` : une photo de
-- prestation est publique, et personne ne peut en deposer, remplacer ni
-- supprimer une en dehors de l espace admin.
--
-- Le bucket lui-meme n est PAS cree ici : il existe deja sur le projet (cree
-- depuis l interface Supabase, `public = true`). Ce bloc ne fait qu ajouter
-- les policies manquantes, qui s appliquent automatiquement a tout fichier de ce
-- bucket.
--
-- ATTENTION : aucune instruction `alter table storage.objects ...` ici, pour la
-- meme raison qu en section 8 — la table appartient a `supabase_storage_admin`
-- et toute commande ALTER echoue. La RLS y est deja activee par defaut.
--
-- Ces politiques ne s appliquent qu au role SQL `authenticated`. Le role `anon`
-- (visiteur) n a QUE la politique de lecture : sans elle, aucune photo ne
-- s afficherait sur /cleaning.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 9.1 Lecture publique des photos
-- -----------------------------------------------------------------------------
-- `using (true)` : tout le monde lit, visiteur non connecte compris.
--
-- La restriction `bucket_id = 'cleaning'` est indispensable : sans elle, la
-- politique ouvrirait la lecture de TOUS les fichiers prives du projet.
-- -----------------------------------------------------------------------------

drop policy if exists "cleaning - lecture publique des photos" on storage.objects;
create policy "cleaning - lecture publique des photos"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'cleaning');

-- -----------------------------------------------------------------------------
-- 9.2 Ecriture reservee aux admins
-- -----------------------------------------------------------------------------
-- Meme condition que la section 8.2 : `public.is_admin(auth.uid())`, qui verifie
-- le role en base plutot que de faire confiance a une valeur envoyee par le
-- client.
--
-- `with check` est indispensable sur INSERT et UPDATE : il verifie la ligne qui
-- va etre ecrite. Sans lui, un admin pourrait deposer un fichier dans un bucket
-- prive en positionnant `bucket_id` sur un autre nom.
-- -----------------------------------------------------------------------------

drop policy if exists "cleaning - envoi de photos par un admin" on storage.objects;
create policy "cleaning - envoi de photos par un admin"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'cleaning' and public.is_admin(auth.uid()));

drop policy if exists "cleaning - modification de photos par un admin" on storage.objects;
create policy "cleaning - modification de photos par un admin"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'cleaning' and public.is_admin(auth.uid()))
  with check (bucket_id = 'cleaning' and public.is_admin(auth.uid()));

drop policy if exists "cleaning - suppression de photos par un admin" on storage.objects;
create policy "cleaning - suppression de photos par un admin"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'cleaning' and public.is_admin(auth.uid()));
