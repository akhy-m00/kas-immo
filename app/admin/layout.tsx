import { requireAdmin } from "@/lib/supabase/auth";

/**
 * Garde de layout pour toute la section `/admin`.
 *
 * Placée ici plutôt que dans `app/admin/page.tsx` : une future page
 * `/admin/biens` ou `/admin/demandes` serait protégée sans avoir à penser à
 * appeler la garde. Le rôle est relu en base à chaque requête, donc un compte
 * rétrogradé perd l'accès immédiatement.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return children;
}
