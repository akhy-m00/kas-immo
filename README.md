# KAS — Keur Anta Services

Site vitrine de **Keur Anta Services** (KAS), agence immobilière et de nettoyage
professionnel à Dakar. Deux pôles : **KAS Immobilier** (location, vente, achat,
gestion locative) et **KAS Cleaning** (nettoyage d'appartements, studios,
maisons et bureaux).

## Stack

- [Next.js](https://nextjs.org) 16 (App Router, Turbopack)
- React 19 · TypeScript
- [Supabase](https://supabase.com) (auth, base de données, stockage photos)
- Tailwind CSS v4 · composants [shadcn/ui](https://ui.shadcn.com) (Radix)
- `motion` (animations) · `lenis` (défilement fluide)

## Démarrage

Prérequis : Node.js 20+ et npm.

1. Installer les dépendances :

   ```bash
   npm install
   ```

2. Créer `.env.local` à partir du modèle, puis renseigner les valeurs
   (Supabase > Project Settings > API) :

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Portée | Rôle |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | navigateur | URL du projet Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | navigateur | Clé publiable (RLS appliquée) |
   | `SUPABASE_SECRET_KEY` | serveur | Clé secrète, scripts de maintenance uniquement |

3. Lancer le serveur de développement :

   ```bash
   npm run dev
   ```

   Ouvrir [http://localhost:3000](http://localhost:3000).

## Scripts

| Commande | Description |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Démarre le build de production |
| `npm run lint` | ESLint |

La vérification des types se fait avec `npx tsc --noEmit`.

## Structure

- `app/` — routes (App Router) : pages publiques, `admin/`, auth.
- `components/` — UI, layout, animations.
- `lib/` — accès données (Supabase), configuration du site, utilitaires.
- `supabase/migrations/` — schéma et politiques RLS.
- `scripts/` — maintenance (conversion WebP, génération de logos, etc.).
- `proxy.ts` — middleware de rafraîchissement de session.

## Déploiement

Le build doit recevoir les trois variables d'environnement ci-dessus. Sur
Vercel, les ajouter dans *Project Settings > Environment Variables* pour chaque
environnement (Production, Preview, Development). La clé secrète n'est requise
que par les scripts, pas par le runtime du site.

## Authentification : réglage requis dans Supabase

## Authentification : réglage requis dans Supabase

L'inscription et la connexion se font par **numéro de téléphone + mot de passe** (numéro sénégalais normalisé en `+221XXXXXXXXX`). Aucun SMS, aucun OTP, aucun fournisseur SMS.

### Comment le numéro devient un identifiant

Supabase n'a pas d'identifiant téléphone gratuit : son fournisseur « Phone » exige un service SMS payant, alors qu'un mot de passe n'a besoin d'aucun envoi. KAS Immo utilise donc l'authentification **e-mail + mot de passe**, avec une adresse technique **dérivée du numéro**, calculée à la volée par `emailInterneDepuisTelephone()` (`lib/phone.ts`) :

```
+221771234567  →  771234567@compte.invalid
```

Cette adresse est un identifiant, pas une donnée : elle n'est stockée nulle part, jamais affichée, jamais envoyée dans un e-mail. Comme la fonction est déterministe, l'inscription et la connexion reconstruisent toujours la même adresse, et l'unicité du numéro découle de l'unicité de l'adresse — sans index supplémentaire en base.

Le domaine `.invalid` est réservé (RFC 6761) : il ne peut pas être enregistré dans le DNS, donc aucune adresse de cette forme n'appartient à un vrai client. C'est ce qui permet à `estEmailTechniqueInterne()` de distinguer une adresse technique d'un vrai e-mail sans liste à maintenir — il est utilisé pour masquer l'adresse technique dans `/mon-compte` et dans le header.

### Réglage manuel

Un seul réglage, à appliquer une fois dans **Supabase Dashboard > Authentication > Sign In / Providers > Email** :

| Réglage | Valeur attendue | Pourquoi |
| --- | --- | --- |
| Confirm email | **désactivé** | Tant qu'il est activé, le compte créé n'est pas confirmé, aucune session n'est renvoyée à l'inscription et la connexion échoue avec « Email not confirmed ». Le projet n'envoie aucun e-mail vers `@compte.invalid`. |

Si ce réglage est réactivé par erreur, aucun e-mail ne part vers le domaine technique (l'envoi échoue côté SMTP, sans conséquence) et les comptes ne peuvent plus se connecter : l'inscription et la connexion affichent alors un message invitant à contacter l'agence.

Sont conservés en parallèle : la connexion **Google**, et un bloc de connexion **e-mail + mot de passe** pour les comptes créés avant le passage au numéro (ils ne sont ni convertis ni supprimés). La réinitialisation de mot de passe reste possible par e-mail pour ces comptes ; un compte créé avec un numéro seul doit passer par l'agence, et `requestPasswordReset()` refuse explicitement toute adresse technique.

Base de données : aucune migration n'est nécessaire, et les politiques RLS ne sont pas modifiées. `public.profiles.phone` existe déjà et le déclencheur `handle_new_user` le remplit depuis `raw_user_meta_data` (voir `lib/supabase/auth-client.ts`, fonction `signUp`). L'identifiant de connexion change, mais pas l'UUID de `auth.users.id` : les demandes existantes restent rattachées à leur auteur.
