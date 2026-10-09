import Image from "next/image";

import { ParallaxPhoto } from "@/components/motion/ParallaxPhoto";
import { cn } from "@/lib/utils";

type BackgroundSectionProps = {
  /** Chemin public de la photo, ex. `/images/backgrounds/hero.webp`. */
  image: string;
  /** Décrit la photo pour les lecteurs d'écran. */
  alt: string;
  /**
   * `true` pour une image au-dessus de la ligne de flottaison (hero) :
   * elle est alors préchargée et non différée.
   */
  priority?: boolean;
  /**
   * Opacité du voile noir, de 0 (photo seule) à 1 (photo invisible).
   * Le dégradé va de `overlay` en haut à `overlay + 0.2` en bas.
   */
  overlay?: number;
  /**
   * Position CSS du sujet dans le cadre. Utile en portrait mobile, où un
   * cadrage centré peut couper le sujet principal.
   */
  objectPosition?: string;
  /** Couleur de fond pendant le chargement, pour éviter tout flash blanc. */
  backgroundColor?: string;
  /** Texte alternatif de la miniature de flou. */
  blurDataURL?: string;
  /**
   * Tailles candidates servies par `next/image`. `100vw` convient à une
   * bannière plein écran, mais surestimerait une carte occupant la moitié de la
   * grille : le navigateur chargerait alors une photo deux fois plus large
   * que nécessaire.
   */
  sizes?: string;
  /** Classes de hauteur / mise en page sur la section. */
  className?: string;
  /** Classes appliquées au conteneur `relative` qui porte le contenu. */
  contentClassName?: string;
  /** Décalage de la parallaxe en pixels. 0 pour désactiver l'effet. */
  parallax?: number;
  children?: React.ReactNode;
};

export function BackgroundSection({
  image,
  alt,
  priority = false,
  overlay = 0.55,
  objectPosition = "center",
  backgroundColor = "#240210",
  blurDataURL,
  sizes = "100vw",
  className,
  contentClassName,
  parallax = 0,
  children,
}: BackgroundSectionProps) {
  const top = Math.min(Math.max(overlay, 0), 1);
  const bottom = Math.min(top + 0.2, 1);

  const photo = (
    <Image
      src={image}
      alt={alt}
      fill
      priority={priority}
      placeholder={blurDataURL ? "blur" : "empty"}
      blurDataURL={blurDataURL}
      sizes={sizes}
      style={{ objectPosition }}
      className="object-cover"
    />
  );

  return (
    <section
      className={cn("relative isolate overflow-hidden", className)}
      style={{ backgroundColor }}
    >
      {parallax > 0 ? (
        <div className="-z-10 absolute inset-0">
          <ParallaxPhoto distance={parallax}>{photo}</ParallaxPhoto>
        </div>
      ) : (
        <div className="-z-10 absolute inset-0">{photo}</div>
      )}

      <div
        aria-hidden="true"
        className="-z-10 absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, rgb(0 0 0 / ${top}), rgb(0 0 0 / ${bottom}))`,
        }}
      />

      <div className={cn("relative", contentClassName)}>{children}</div>
    </section>
  );
}
