-- Durcissement de l'authentification.
--
-- 1. Empêcher la prise de contrôle d'un compte avant sa création.
--    « Confirm email » est désactivé (voir README) : toute adresse passée à
--    `signUp` est donc enregistrée comme CONFIRMÉE, sans preuve de propriété.
--    N'importe qui pouvait appeler l'API avec la clé publique et
--    `victime@gmail.com` + un mot de passe ; quand la victime se connectait
--    ensuite avec Google, Supabase reliait son identité Google à ce compte, et
--    l'attaquant gardait l'accès par son mot de passe.
--
--    L'application ne crée que des comptes `@compte.invalid` (numéro de
--    téléphone). La base refuse donc :
--      - toute création d'un compte e-mail/mot de passe hors de ce domaine ;
--      - tout changement d'adresse d'un compte e-mail vers un autre domaine
--        (`updateUser({ email })`, appliqué sans confirmation pour la même
--        raison).
--    Les comptes Google (provider 'google') ne sont pas concernés, et les
--    anciens comptes e-mail existants continuent de se connecter : seuls
--    l'INSERT et le changement d'adresse sont contrôlés.
--
--    ⚠️ Conséquence : « Add user » / « Invite » avec une vraie adresse dans le
--    dashboard Supabase est refusé aussi. Pour une exception, désactiver
--    temporairement le déclencheur (`alter table auth.users disable trigger
--    on_auth_user_email_guard;`) puis le réactiver.
--
-- 2. `public.is_admin(uuid)` n'est plus appelable par les visiteurs (rôle
--    `anon`) : via `/rest/v1/rpc/is_admin`, elle révélait si un identifiant
--    donné est celui de l'administrateur. Aucune politique `to anon` ne
--    l'utilise ; les politiques `to authenticated` continuent de fonctionner.
--
-- 3. Un client ne peut plus modifier `profiles.phone` (ni `role`, `id`,
--    `created_at`) : le numéro affiché à l'administration dans les demandes
--    vient du compte, il ne doit pas être réécrit par son titulaire. Seul
--    `full_name` reste modifiable par l'API. L'application n'écrit pas dans
--    `profiles` ; la promotion d'un admin se fait en SQL (rôle postgres), qui
--    n'est pas concerné par ces droits.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Garde sur auth.users
-- ---------------------------------------------------------------------------
create or replace function public.garde_email_compte()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fournisseur text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  domaine_ok  boolean := lower(coalesce(new.email, '')) like '%@compte.invalid';
begin
  if fournisseur <> 'email' or domaine_ok then
    return new;
  end if;

  if tg_op = 'INSERT' then
    raise exception 'Inscription refusée : seuls les comptes par numéro de téléphone sont autorisés.'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.email is distinct from old.email then
    raise exception 'Changement d''adresse e-mail refusé.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function public.garde_email_compte() is
  'Refuse la création d''un compte e-mail/mot de passe, ou le passage d''un tel compte, vers une adresse hors @compte.invalid (confirmation des e-mails désactivée).';

revoke execute on function public.garde_email_compte() from public, anon, authenticated;

drop trigger if exists on_auth_user_email_guard on auth.users;
create trigger on_auth_user_email_guard
  before insert or update of email on auth.users
  for each row
  execute function public.garde_email_compte();

-- ---------------------------------------------------------------------------
-- 2. is_admin réservé aux utilisateurs connectés
-- ---------------------------------------------------------------------------
revoke execute on function public.is_admin(uuid) from public, anon;
grant  execute on function public.is_admin(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Colonnes de profiles modifiables par l'API
-- ---------------------------------------------------------------------------
revoke update on public.profiles from anon, authenticated;
grant  update (full_name) on public.profiles to authenticated;

COMMIT;

-- Contrôle a posteriori (à lancer à la main) : comptes e-mail/mot de passe
-- hors domaine technique. Les anciens comptes légitimes y figurent ; toute
-- adresse que vous ne reconnaissez pas a pu être créée par un tiers.
--
--   select id, email, created_at, last_sign_in_at
--   from auth.users
--   where coalesce(raw_app_meta_data ->> 'provider', 'email') = 'email'
--     and email not ilike '%@compte.invalid'
--   order by created_at desc;
