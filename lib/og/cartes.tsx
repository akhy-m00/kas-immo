import { ImageResponse } from "next/og";

import { immobilierContact, siteConfig } from "@/lib/site";

import { COULEURS, polices, visuel, type NomVisuel } from "./ressources";

/**
 * Gabarits des images de partage (réseaux sociaux, messageries) et du kit de
 * marque.
 *
 * Rendu par `ImageResponse` (Satori) : seul un sous-ensemble de CSS est
 * disponible — flexbox, positionnement absolu, dégradés. Tout `div` qui a
 * plusieurs enfants doit donc déclarer `display: flex`.
 */

/** Taille recommandée par Facebook, LinkedIn, X et WhatsApp. */
export const TAILLE_OG = { width: 1200, height: 630 };

/** Domaine affiché en pied d'image, sans protocole. */
const DOMAINE = new URL(siteConfig.url).host;

/** Dégradé posé sur la photo : lisibilité du texte à gauche. */
const VOILE =
  "linear-gradient(90deg, rgba(20,4,11,0.96) 0%, rgba(20,4,11,0.86) 48%, rgba(20,4,11,0.45) 100%)";

type Logo = "immobilier" | "cleaning" | "les-deux";

/** Pastille blanche portant le ou les logos de la marque. */
async function BlocLogo({ logo, hauteur }: { logo: Logo; hauteur: number }) {
  const immobilier = await visuel("logo-immobilier");
  const cleaning = await visuel("logo-cleaning");

  // Proportions réelles des fichiers : 1138×724 et 516×424.
  const largeurImmo = Math.round((hauteur * 1138) / 724);
  const largeurCleaning = Math.round((hauteur * 516) / 424);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 28,
        background: COULEURS.blanc,
        borderRadius: 24,
        padding: "14px 26px",
      }}
    >
      {logo !== "cleaning" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={immobilier} width={largeurImmo} height={hauteur} alt="" />
      ) : null}
      {logo === "les-deux" ? (
        <div style={{ width: 2, height: hauteur * 0.8, background: "#e5e5e5" }} />
      ) : null}
      {logo !== "immobilier" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cleaning} width={largeurCleaning} height={hauteur} alt="" />
      ) : null}
    </div>
  );
}

export type CarteOg = {
  /** Petit libellé au-dessus du titre (ex. « Immobilier · Dakar »). */
  surtitre: string;
  titre: string;
  sousTitre?: string;
  /** Pastilles en bas à gauche (services, prix…). */
  pastilles?: string[];
  /** Pastille mise en avant, pleine couleur (ex. le prix d'un bien). */
  miseEnAvant?: string;
  logo: Logo;
  /** Un fond de marque, ou une photo déjà convertie en data URI. */
  fond: NomVisuel | { dataUri: string };
};

/** Carte générique de la marque : accueil et aperçu par défaut. */
export const CARTE_ACCUEIL: CarteOg = {
  surtitre: "Dakar · Sénégal",
  titre: siteConfig.name,
  sousTitre: "Immobilier et nettoyage professionnel, avec un seul interlocuteur.",
  pastilles: ["Location", "Vente", "Gestion locative", "Nettoyage"],
  logo: "les-deux",
  fond: "fond-accueil",
};

/** Image Open Graph 1200×630 aux couleurs de la marque. */
export async function imageOg(carte: CarteOg): Promise<ImageResponse> {
  const fond =
    typeof carte.fond === "string" ? await visuel(carte.fond) : carte.fond.dataUri;
  const titre =
    carte.titre.length > 72 ? `${carte.titre.slice(0, 70).trimEnd()}…` : carte.titre;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          fontFamily: "Inter",
          color: COULEURS.blanc,
          background: COULEURS.encre,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fond}
          width={TAILLE_OG.width}
          height={TAILLE_OG.height}
          alt=""
          style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundImage: VOILE,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 12,
            height: "100%",
            background: COULEURS.bordeaux,
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "52px 64px 48px 76px",
          }}
        >
          <div style={{ display: "flex" }}>
            {await BlocLogo({ logo: carte.logo, hauteur: 84 })}
          </div>

          <div style={{ display: "flex", flexDirection: "column", maxWidth: 880 }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: COULEURS.bordeauxClair,
              }}
            >
              {carte.surtitre}
            </div>
            <div
              style={{
                marginTop: 14,
                fontFamily: "Jakarta",
                fontWeight: 800,
                fontSize: titre.length > 40 ? 58 : 68,
                lineHeight: 1.08,
              }}
            >
              {titre}
            </div>
            {carte.sousTitre ? (
              <div
                style={{
                  marginTop: 18,
                  fontSize: 28,
                  fontWeight: 500,
                  lineHeight: 1.35,
                  color: "rgba(255,255,255,0.86)",
                }}
              >
                {carte.sousTitre}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", gap: 12 }}>
              {carte.miseEnAvant ? (
                <div
                  style={{
                    display: "flex",
                    fontFamily: "Jakarta",
                    fontWeight: 700,
                    fontSize: 30,
                    padding: "10px 24px",
                    borderRadius: 999,
                    background: COULEURS.bordeaux,
                  }}
                >
                  {carte.miseEnAvant}
                </div>
              ) : null}
              {(carte.pastilles ?? []).map((pastille) => (
                <div
                  key={pastille}
                  style={{
                    display: "flex",
                    fontSize: 22,
                    fontWeight: 600,
                    padding: "10px 20px",
                    borderRadius: 999,
                    border: "2px solid rgba(255,255,255,0.4)",
                  }}
                >
                  {pastille}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 24, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
              {DOMAINE}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...TAILLE_OG, fonts: await polices() },
  );
}

// ---------------------------------------------------------------------------
// Kit de marque : visuels à télécharger pour les profils des réseaux sociaux.
// ---------------------------------------------------------------------------

/** Photo de profil carrée (Instagram, TikTok, Facebook, WhatsApp Business). */
export async function imageProfil(pole: "immobilier" | "cleaning", cote = 1080) {
  // Le logo Cleaning porte une signature blanche, invisible sur fond blanc :
  // il est donc posé sur le fond sombre de la marque, dans sa variante claire.
  const sombre = pole === "cleaning";
  const logo = await visuel(sombre ? "logo-cleaning-dark" : "logo-immobilier");
  const [lw, lh] = pole === "immobilier" ? [1138, 724] : [516, 424];
  // Les profils sont rognés en cercle : le logo reste dans le disque inscrit.
  const largeur = Math.round(cote * (pole === "immobilier" ? 0.66 : 0.56));
  const hauteur = Math.round((largeur * lh) / lw);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: sombre ? COULEURS.encre : COULEURS.blanc,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={largeur} height={hauteur} alt="" />
      </div>
    ),
    { width: cote, height: cote },
  );
}

/** Bannière 1500×500 (X, LinkedIn ; recadrée correctement par Facebook). */
export async function imageBanniere() {
  const fond = await visuel("fond-accueil");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          fontFamily: "Inter",
          color: COULEURS.blanc,
          background: COULEURS.encre,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fond}
          width={1500}
          height={844}
          alt=""
          style={{ position: "absolute", top: -172, left: 0 }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundImage:
              "linear-gradient(90deg, rgba(20,4,11,0.2) 0%, rgba(20,4,11,0.75) 45%, rgba(20,4,11,0.95) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-end",
            width: "100%",
            height: "100%",
            padding: "0 90px",
            textAlign: "right",
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: COULEURS.bordeauxClair,
            }}
          >
            Dakar · Sénégal
          </div>
          <div
            style={{
              marginTop: 12,
              fontFamily: "Jakarta",
              fontWeight: 800,
              fontSize: 76,
            }}
          >
            {siteConfig.name}
          </div>
          <div style={{ marginTop: 10, fontSize: 32, fontWeight: 500, color: "rgba(255,255,255,0.88)" }}>
            Immobilier & nettoyage professionnel
          </div>
          <div style={{ marginTop: 26, display: "flex", gap: 14 }}>
            {["Location", "Vente", "Gestion locative", "Nettoyage"].map((t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  fontSize: 22,
                  fontWeight: 600,
                  padding: "8px 18px",
                  borderRadius: 999,
                  border: "2px solid rgba(255,255,255,0.45)",
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { width: 1500, height: 500, fonts: await polices() },
  );
}

/** Publication portrait 1080×1350 (format recommandé par Instagram). */
export async function imagePublication() {
  const fond = await visuel("fond-accueil");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Inter",
          background: COULEURS.blanc,
        }}
      >
        <div style={{ display: "flex", position: "relative", width: 1080, height: 840 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fond}
            width={1493}
            height={840}
            alt=""
            style={{ position: "absolute", top: 0, left: -206 }}
          />
          <div
            style={{
              position: "absolute",
              top: 48,
              left: 48,
              display: "flex",
            }}
          >
            {await BlocLogo({ logo: "les-deux", hauteur: 96 })}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "56px 64px",
            borderTop: `12px solid ${COULEURS.bordeaux}`,
          }}
        >
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: COULEURS.bordeaux,
            }}
          >
            Dakar · Sénégal
          </div>
          <div
            style={{
              marginTop: 14,
              fontFamily: "Jakarta",
              fontWeight: 800,
              fontSize: 64,
              lineHeight: 1.08,
              color: COULEURS.encre,
            }}
          >
            Votre partenaire immobilier et nettoyage
          </div>
          <div style={{ marginTop: 20, fontSize: 30, fontWeight: 500, color: "#444" }}>
            Location · Vente · Gestion locative · Nettoyage
          </div>
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              justifyContent: "space-between",
              fontSize: 28,
              fontWeight: 600,
              color: COULEURS.encre,
            }}
          >
            <div style={{ display: "flex" }}>{DOMAINE}</div>
            <div style={{ display: "flex", color: COULEURS.bordeaux }}>{immobilierContact.fixedLine.display}</div>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, fonts: await polices() },
  );
}
