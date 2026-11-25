"use client";

import { cn } from "@/lib/utils";

import {
  CLASSE_AIDE,
  CLASSE_CHAMP,
  CLASSE_ERREUR,
  CLASSE_GROUPE,
  CLASSE_LIBELLE,
} from "./styles";

export type ChampProps = {
  id: string;
  label: string;
  type?: string;
  name?: string;
  autoComplete?: string;
  /** Exemple discret affiché dans la case vide (ex. `Ex : 77 123 45 67`). */
  placeholder?: string;
  className?: string;
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  /** Clavier virtuel souhaité sur mobile (`tel` pour un numéro). */
  inputMode?: "text" | "numeric" | "tel" | "email" | "url";
  /** Aide affichée SOUS la case, masquée tant qu'une erreur est présente. */
  hint?: string;
  /** Message d'erreur affiché sous la case. */
  error?: string;
};

/**
 * Champ texte unique du site : libellé au-dessus, case, puis aide ou erreur.
 *
 * Remplace l'ancien `FloatingField` (libellé flottant DANS la case) et le
 * champ propre aux pages d'authentification : tous les formulaires — Cleaning,
 * demande de visite, connexion, inscription, administration — ont désormais la
 * même structure et le même rendu. Le style vit dans `./styles.ts`.
 */
export function Champ({
  id,
  label,
  type = "text",
  name,
  autoComplete,
  placeholder,
  className,
  value,
  onValueChange,
  required,
  minLength,
  maxLength,
  inputMode,
  hint,
  error,
}: ChampProps) {
  // `aria-describedby` ne pointe que vers la ligne réellement affichée.
  const showHint = Boolean(hint) && !error;
  const describedBy =
    [showHint ? `${id}-indice` : null, error ? `${id}-erreur` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className={cn(CLASSE_GROUPE, className)}>
      <label htmlFor={id} className={CLASSE_LIBELLE}>
        {label}
      </label>

      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={CLASSE_CHAMP}
      />

      {showHint ? (
        <p id={`${id}-indice`} className={CLASSE_AIDE}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-erreur`} role="alert" className={CLASSE_ERREUR}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
