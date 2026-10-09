-- Soutient la garantie « un seul administrateur » côté base.
--
-- L'application ne conduit plus jamais à une autopromotion (la politique RLS
-- des `profiles` oblige un utilisateur à rester `client` sur sa propre ligne),
-- mais une promotion maladroite passée par le rôle service ou le dashboard
-- Supabase pourrait encore créer un doublon. Un index unique partiel rend cette
-- situation structurellement impossible, et le garde-fou `DO` la détecte avec
-- un message clair avant toute tentative d'écriture.
--
-- Migration purement défensive : elle ne modifie aucune donnée, donc aucun
-- conflit avec l'existant tant qu'il n'y a pas déjà deux lignes `admin`.

BEGIN;

-- Garde-fou : si la base contenait déjà plusieurs administrateurs, s'arrêter
-- avec un message explicite plutôt que d'échouer sur la création d'index.
DO $$
DECLARE
  nb_admins integer;
BEGIN
  SELECT count(*) INTO nb_admins
  FROM public.profiles
  WHERE role = 'admin';

  IF nb_admins > 1 THEN
    RAISE EXCEPTION 'Refus : % lignes ont le rôle admin, il faut en laisser une seule avant de créer la contrainte (profiles_un_seul_admin).', nb_admins;
  END IF;
END $$;

-- Au plus une ligne `admin` dans `profiles`. L'index est partiel : `client`
-- reste totalement libre, et les autres rôles futurs (modération, etc.)
-- pourraient avoir leurs propres contraintes.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_un_seul_admin
  ON public.profiles ((true))
  WHERE role = 'admin';

COMMIT;