import {
  CLASSE_CHAMP_DATE_HEURE,
  CLASSE_ERREUR,
  CLASSE_GROUPE,
  CLASSE_LIBELLE,
} from "@/components/forms/styles";
import { aujourdhuiAuSite } from "@/lib/requests";

/**
 * Champ natif `date` ou `time`, avec un libellé fixe au-dessus.
 *
 * Partagé par les deux formulaires de demande — visite d'un bien et
 * rendez-vous Cleaning — pour qu'une correction profite aux deux.
 *
 * ⚠️ Débordement sur Safari iOS : un `<input type="date">` y a une largeur
 * native incompressible, qui faisait sortir la case du formulaire à droite.
 * `CLASSE_CHAMP_DATE_HEURE` retire l'apparence native (`appearance: none`),
 * force `min-width: 0` et la pleine largeur ; `app/globals.css` aligne en plus
 * la valeur à gauche (`::-webkit-date-and-time-value`). Le conteneur porte
 * `min-w-0` pour qu'une grille ne puisse pas s'élargir à cause de lui.
 */
export function ChampDateHeure({
  id,
  name,
  label,
  type,
  value,
  onValueChange,
  min,
  max,
  error,
}: {
  id: string;
  name: string;
  label: string;
  type: "date" | "time";
  value: string;
  onValueChange: (value: string) => void;
  min?: string;
  max?: string;
  error?: string;
}) {
  return (
    <div className={CLASSE_GROUPE}>
      <label htmlFor={id} className={CLASSE_LIBELLE}>
        {label}
      </label>

      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        required
        min={min}
        max={max}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-erreur` : undefined}
        className={CLASSE_CHAMP_DATE_HEURE}
      />

      {error ? (
        <p id={`${id}-erreur`} role="alert" className={CLASSE_ERREUR}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Dernier jour sélectionnable dans un champ `<input type="date">`.
 *
 * La borne est calculée à Dakar, comme `aujourdhuiAuSite()` côté serveur : les
 * deux extrémités de la plage doivent tomber sur le même jour, sinon le
 * navigateur proposerait des dates que la validation refuse.
 */
export function limiteDeSelection(joursMax: number): string {
  const limite = new Date(`${aujourdhuiAuSite()}T00:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() + joursMax);

  return aujourdhuiAuSite(limite);
}