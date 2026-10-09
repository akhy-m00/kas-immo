import { createPublicClient } from "@/lib/supabase/public";
import type { CleaningService } from "@/lib/supabase/database.types";

/**
 * Lecture publique des prestations de cleaning, côté serveur.
 *
 * Même séparation que pour les biens : la page publique utilise le client sans
 * cookies et sans session (`lib/supabase/public.ts`), ce qui lui permet de rester
 * mise en cache tout en servant des données que la RLS déclare publiques. Aucune
 * clé de service n'est employée ici.
 */

const CLEANING_SELECT = "id, title, description, image_url, created_at";

/**
 * Tous les services publiés, du plus récent au plus ancien.
 *
 * La table n'a pas de statut : tout ce qui y figure est public. Contrairement
 * aux biens, où l'administrateur peut retirer une annonce, une prestation
 * cleaning se masque en la supprimant.
 */
export async function listerServicesPublics(): Promise<CleaningService[]> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("cleaning_services")
    .select(CLEANING_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Services de cleaning injoignables : ${error.message ?? "raison inconnue"}`,
    );
  }

  return data ?? [];
}
