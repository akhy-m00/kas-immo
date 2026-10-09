import Image from "next/image";

import type { LogoConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

type ThemedLogoProps = {
  /** Entrée de `lib/site.ts` décrivant le logo et ses deux variantes. */
  logo: LogoConfig;
  /** Remplace le texte alternatif défini dans la configuration. */
  alt?: string;
  className?: string;
  priority?: boolean;
  /**
   * Indique au navigateur la largeur réellement occupée, pour qu'il ne
   * télécharge pas une version bien plus grande que nécessaire. Un logo
   * n'occupe jamais toute la largeur : 96 px suffisent au maximum.
   */
  sizes?: string;
};

/**
 * Affiche la version claire ou sombre du logo selon le thème actif.
 *
 * Les deux images sont présentes dans le DOM et l'une est masquée par CSS :
 * `dark:hidden` / `hidden dark:block`. Cela évite tout flash de la mauvaise
 * version, y compris au tout premier rendu avant l'exécution du script de
 * `next-themes`.
 */
export function ThemedLogo({
  logo,
  alt,
  className,
  priority = false,
  sizes = "(max-width: 640px) 96px, 128px",
}: ThemedLogoProps) {
  return (
    <>
      <Image
        src={logo.src}
        alt={alt ?? logo.alt}
        width={logo.width}
        height={logo.height}
        priority={priority}
        // `sizes` n'est respecté par le navigateur que pour une image
        // préchargée ou explicitly priorisée. Sans ce `fetchPriority`, un logo
        // sans `priority` est téléchargé à la largeur de l'appareil (384 px
        // sur mobile) au lieu des 96 px réels : 12,7 Ko au lieu de 2,6 Ko.
        fetchPriority={priority ? "high" : undefined}
        sizes={sizes}
        className={cn("dark:hidden", className)}
      />
      <Image
        src={logo.darkSrc}
        alt=""
        aria-hidden="true"
        width={logo.width}
        height={logo.height}
        priority={priority}
        sizes={sizes}
        className={cn("hidden dark:block", className)}
      />
    </>
  );
}
