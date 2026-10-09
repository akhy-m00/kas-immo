import type { UserRole } from "./database.types";

/**
 * Destination d'un utilisateur connecté, selon son rôle.
 *
 * Isolé dans son propre module, sans import de `next/*` ni de client Supabase,
 * pour être utilisable aussi bien depuis un Server Component que depuis un
 * Client Component. Importer cette fonction depuis `auth.ts` ferait entrer
 * `next/headers` dans le bundle navigateur et ferait échouer le build.
 */
export function homeForRole(role: UserRole): "/admin" | "/mon-compte" {
  return role === "admin" ? "/admin" : "/mon-compte";
}
