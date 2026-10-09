import { ThemedLogo } from "@/components/ThemedLogo";
import type { LogoConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

type SectionBadgeProps = {
  /** Configuration du logo du pôle, avec sa variante sombre */
  logo: LogoConfig;
  /** Nom du pôle, rendu comme titre de la section */
  titre: string;
  /** Courte phrase d’accroche sous le titre */
  sousTitre: string;
  /**
   * `carte` : pose le logo et le titre sur une carte translucide, à utiliser
   * par-dessus une photo. `nu` : le contenu se pose directement sur le fond.
   */
  surface?: "carte" | "nu";
  /** Classes additionnelles sur le conteneur */
  className?: string;
};

export function SectionBadge({
  logo,
  titre,
  sousTitre,
  surface = "nu",
  className,
}: SectionBadgeProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left",
        // La carte doit epouser son contenu et non s'etirer sur toute la
        // largeur : sans cela elle recouvre la photo de fond.
        surface === "carte" &&
          "w-fit max-w-full rounded-2xl border border-white/70 bg-white/90 p-5 shadow-lift backdrop-blur-md sm:p-6 dark:border-white/15 dark:bg-[#161616]/90",
        className,
      )}
    >
      <ThemedLogo
        logo={logo}
        className="h-14 w-auto max-w-[42%] shrink-0 object-contain sm:h-16 lg:h-20"
      />
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl">{titre}</h1>
        <p
          className={cn(
            "mt-1.5 text-sm text-muted-foreground sm:text-base",
            surface === "nu" && "text-white/85",
          )}
        >
          {sousTitre}
        </p>
      </div>
    </div>
  );
}
